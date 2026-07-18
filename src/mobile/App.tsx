import { useCallback, useEffect, useMemo, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import { NATIVE_LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage } from '../shared/constants.js';
import type { PairingPayload, SignedConnectionProfile } from '../shared/sync.js';
import {
  MobileDatabase,
  type MobileConfig,
  type MobileConnectionMode,
  type MobileDueCard,
  type MobileLearningLanguageState,
  type MobileProgress,
} from './db.js';
import { MobileError, toMobileError } from './errors.js';
import { formatMobileError, formatMobileText, mobileLocale, mobileTranslations } from './i18n.js';
import { normalizeNativeMediaPath } from './media.js';
import { MobileSyncClient, parsePairingPayload } from './syncClient.js';
import './styles.css';

const database = new MobileDatabase();
const syncClient = new MobileSyncClient(database);
const emptyLearningState: MobileLearningLanguageState = {
  hasSnapshot: false, pcTargetLanguage: null, effectiveTargetLanguage: null,
  targetLanguageOverride: null, availableTargetLanguages: [], followsPc: true,
};
type StatusMessage = { kind: 'success' | 'error' | 'info'; text: string } | null;

export function MobileApp(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<MobileConfig | null>(null);
  const [due, setDue] = useState<MobileDueCard | null>(null);
  const [nextDueAt, setNextDueAt] = useState<string | null>(null);
  const [pairingText, setPairingText] = useState('');
  const [profileText, setProfileText] = useState('');
  const [lanAddress, setLanAddress] = useState('');
  const [progress, setProgress] = useState<MobileProgress>({ reviewedToday: 0, dailyLimit: 0, pendingUpload: 0 });
  const [connectionMode, setConnectionMode] = useState<MobileConnectionMode>('auto');
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [message, setMessage] = useState<StatusMessage>(null);
  const [learning, setLearning] = useState<MobileLearningLanguageState>(emptyLearningState);
  const [pendingRating, setPendingRating] = useState<'again' | 'good' | null>(null);
  const language = (config?.interface_language ?? '英语') as SupportedLanguage;
  const t = mobileTranslations[language] ?? mobileTranslations.英语;
  const setError = useCallback((error: unknown) => {
    setMessage({ kind: 'error', text: formatMobileError(toMobileError(error), t) });
  }, [t]);

  const refresh = useCallback(async () => {
    const nextConfig = await database.getConfig();
    setConfig(nextConfig);
    setConnectionMode(nextConfig.connection_mode ?? nextConfig.selected_transport);
    setLanAddress(nextConfig.lan_url ?? '');
    const nextLearning = await database.learningLanguageState();
    setLearning(nextLearning);
    setDue(await database.nextDueCard());
    setNextDueAt(await database.nextDueAt());
    setProgress(await database.progress());
  }, []);

  const sync = useCallback(async (quiet = false) => {
    const current = await database.getConfig();
    if (!current.credential || busy) return;
    setBusy(true);
    if (!quiet) setMessage(null);
    try {
      const result = await syncClient.syncNow();
      if (!quiet) setMessage({ kind: 'success', text: formatMobileText(t.syncSummary, {
        revision: result.revision, uploaded: result.uploaded, downloaded: result.downloadedMedia,
      }) });
      await refresh();
    } catch (error) {
      if (!quiet) setError(error);
    } finally {
      await refresh();
      setBusy(false);
    }
  }, [busy, refresh, setError, t.syncSummary]);

  useEffect(() => {
    let active = true;
    void database.open().then(async () => {
      if (!active) return;
      await refresh();
      setReady(true);
      const current = await database.getConfig();
      if (current.credential) void sync(true);
    }).catch(setError);
    const listener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void sync(true);
    });
    return () => { active = false; void listener.then((handle) => handle.remove()); };
  }, []); // database and sync client are stable process singletons

  useEffect(() => {
    if (!nextDueAt) return undefined;
    const delay = Date.parse(nextDueAt) - Date.now();
    if (delay <= 0) {
      void refresh();
      return undefined;
    }
    const timer = window.setTimeout(() => void refresh(), Math.min(delay + 50, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [nextDueAt, refresh]);

  const scanValue = async (): Promise<string> => {
    const supported = await BarcodeScanner.isSupported();
    if (!supported.supported) throw new MobileError('scanner_unsupported');
    if (Capacitor.getPlatform() === 'android') {
      const module = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!module.available) {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
        throw new MobileError('scanner_installing');
      }
    }
    const result = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
    const raw = result.barcodes[0]?.rawValue;
    if (!raw) throw new MobileError('qr_not_read');
    return raw;
  };

  const scan = async (): Promise<void> => {
    setMessage(null);
    try {
      setPairingText(await scanValue());
    } catch (error) {
      setError(error);
    }
  };

  const pairingPayload = useMemo<PairingPayload | null>(() => {
    try { return pairingText ? parsePairingPayload(pairingText) : null; } catch { return null; }
  }, [pairingText]);

  const pair = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    try {
      const payload = parsePairingPayload(pairingText);
      if (connectionMode === 'lan' && !payload.lan) throw new MobileError('pairing_transport_missing');
      if (connectionMode === 'tailscale' && !payload.tailscale_url) throw new MobileError('pairing_transport_missing');
      await syncClient.pairAndWait(payload, connectionMode, () => setWaiting(true));
      setWaiting(false);
      await syncClient.syncNow();
      await refresh();
    } catch (error) {
      setWaiting(false);
      setError(error);
    } finally {
      // Approval stores the long-term credential before the first snapshot is
      // downloaded. Refresh even when that initial sync fails so the app moves
      // to the paired screen and lets the user retry without pairing again.
      await refresh();
      setBusy(false);
    }
  };

  const confirmReview = async (ratingOverride?: 'again' | 'good'): Promise<void> => {
    const rating = ratingOverride ?? pendingRating;
    if (!due || !rating) return;
    setBusy(true);
    try {
      await database.submitReview(due.id, rating);
      setPendingRating(null);
      await refresh();
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  };

  const toggleFavorite = async (): Promise<void> => {
    if (!due) return;
    setBusy(true);
    setMessage(null);
    try {
      await database.toggleFavorite(due.id);
      await refresh();
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  };

  const markMastered = async (): Promise<void> => {
    if (!due || !pendingRating) return;
    setBusy(true);
    setMessage(null);
    try {
      await database.submitReviewAndMarkMastered(due.id, pendingRating);
      setPendingRating(null);
      await refresh();
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setPendingRating(null);
  }, [due?.id]);

  const changeTransport = async (value: MobileConnectionMode): Promise<void> => {
    await database.setTransport(value);
    setConnectionMode(value);
    await refresh();
  };

  const updateProfile = async (): Promise<void> => {
    try {
      await syncClient.applySignedConnectionProfile(JSON.parse(profileText) as SignedConnectionProfile);
      setProfileText('');
      await refresh();
      setMessage({ kind: 'success', text: t.connectionUpdated });
    } catch (error) {
      setError(error);
    }
  };

  const languageSelector = <label>{t.interfaceLanguage}<select value={language} onChange={async (event) => {
    await database.setInterfaceLanguage(event.target.value);
    await refresh();
  }}>{SUPPORTED_LANGUAGES.map((item) => <option key={item} value={item}>{NATIVE_LANGUAGE_LABELS[item]}</option>)}</select></label>;

  if (!ready) return <main className="mobile-shell"><section className="panel"><h1>{t.app}</h1><p>{t.preparing}</p>{message && <p className="error">{message.text}</p>}</section></main>;

  if (!config?.credential) {
    return <main className="mobile-shell">
      <section className="panel pair-panel">
        <p className="eyebrow">{t.offline}</p><h1>{t.pairTitle}</h1><p>{t.pairHelp}</p>
        {languageSelector}
        <button className="secondary" onClick={() => void scan()}>{t.scan}</button>
        <textarea value={pairingText} onChange={(event) => setPairingText(event.target.value)} rows={7} spellCheck={false} />
        <div className="segmented">
          <button className={connectionMode === 'auto' ? 'active' : ''} onClick={() => setConnectionMode('auto')}>{t.autoConnection}</button>
          <button className={connectionMode === 'lan' ? 'active' : ''} disabled={!pairingPayload?.lan} onClick={() => setConnectionMode('lan')}>{t.lan}</button>
          <button className={connectionMode === 'tailscale' ? 'active' : ''} disabled={!pairingPayload?.tailscale_url} onClick={() => setConnectionMode('tailscale')}>{t.tailscale}</button>
        </div>
        <button className="primary" disabled={busy || !pairingPayload} onClick={() => void pair()}>{waiting ? t.waiting : t.pair}</button>
        {message && <p className={message.kind === 'error' ? 'error status' : 'status'}>{message.text}</p>}
      </section>
    </main>;
  }

  if (!learning.hasSnapshot) {
    return <main className="mobile-shell">
      <section className="panel initializing-panel">
        <p className="eyebrow">{t.offline}</p><h1>{t.downloadingLibrary}</h1>
        <p>{t.downloadingLibraryHelp}</p>
        {languageSelector}
        <button className="primary" disabled={busy} onClick={() => void sync()}>{busy ? t.syncing : t.retrySync}</button>
        {message && <p className={message.kind === 'error' ? 'error status' : 'status'}>{message.text}</p>}
      </section>
    </main>;
  }

  const answerRevealed = pendingRating !== null;
  const hasLocalVideo = Boolean(due?.media.some((item) => item.media_type === 'video' && item.local_path));

  return <main className="mobile-shell">
    <header className="mobile-header">
      <div><p className="eyebrow">{t.offline}</p><h1>{t.app}</h1></div>
      <button className="secondary compact" disabled={busy} onClick={() => void sync()}>{busy ? t.syncing : t.sync}</button>
    </header>
    {message && <p className={message.kind === 'error' ? 'error status' : 'status'}>{message.text}</p>}
    <section className="mobile-progress"><span>{t.progress}: {progress.reviewedToday} / {progress.dailyLimit || '—'}</span><span>{t.pending}: {progress.pendingUpload}</span></section>
    <section className="review-card">
      {due ? <>
        <p className="language-label">{NATIVE_LANGUAGE_LABELS[due.target_language as SupportedLanguage] ?? due.target_language}</p>
        <h2>{due.target_word}</h2>
        {due.primary_sentence && <blockquote>{due.primary_sentence}</blockquote>}
        {answerRevealed ? <>
          <p className="meaning">{due.context_meaning}</p>
          <div className="media-stack">
            {due.media.map((item) => item.id.startsWith('derived-audio-') && hasLocalVideo
              ? null
              : item.local_path && item.media_type === 'image'
              ? <img key={item.id} src={Capacitor.convertFileSrc(normalizeNativeMediaPath(item.local_path))} alt="" />
              : item.local_path && item.media_type === 'video'
                ? <video key={item.id} src={Capacitor.convertFileSrc(normalizeNativeMediaPath(item.local_path))} controls playsInline preload="metadata" autoPlay />
              : item.local_path && item.media_type === 'audio'
                ? <audio key={item.id} src={Capacitor.convertFileSrc(normalizeNativeMediaPath(item.local_path))} controls autoPlay />
                : item.media_type === 'video' ? <p key={item.id} className="muted">{t.videoUnavailable}</p> : null)}
          </div>
          <div className="card-management-actions">
            <button disabled={busy} className="secondary" onClick={() => void toggleFavorite()}>
              {due.is_favorite ? t.unfavorite : t.favorite}
            </button>
            <button disabled={busy} className="secondary" onClick={() => void markMastered()}>
              {t.markMastered}
            </button>
          </div>
          {pendingRating === 'good' ? (
            <div className="review-actions">
              <button disabled={busy} className="again" onClick={() => void confirmReview('again')}>{t.wrongAgain}</button>
              <button disabled={busy} className="good" onClick={() => void confirmReview()}>{t.next}</button>
            </div>
          ) : (
            <div className="review-actions single-action">
              <button disabled={busy} className="again" onClick={() => void confirmReview()}>{t.confirmAgain}</button>
            </div>
          )}
        </> : <div className="review-actions"><button disabled={busy} className="again" onClick={() => setPendingRating('again')}>{t.again}</button><button disabled={busy} className="good" onClick={() => setPendingRating('good')}>{t.good}</button></div>}
      </> : <div className="empty"><span>✓</span><p>{t.noDue}</p>{nextDueAt ? <p className="muted">{formatMobileText(t.nextReviewAt, { time: new Date(nextDueAt).toLocaleString(mobileLocale(language)) })}</p> : null}</div>}
    </section>
    <section className="panel settings-panel">
      <h3>{t.connection}</h3>
      <p className="muted">{t.syncHelp}</p>
      <div className="language-summary">
        <p><span>{t.pcLearningLanguage}</span><strong>{learning.pcTargetLanguage ? NATIVE_LANGUAGE_LABELS[learning.pcTargetLanguage] : '—'}</strong></p>
        <p><span>{t.phoneLearningLanguage}</span><strong>{learning.effectiveTargetLanguage ? NATIVE_LANGUAGE_LABELS[learning.effectiveTargetLanguage] : '—'}</strong></p>
      </div>
      <label>{t.phoneLearningLanguage}<select value={learning.targetLanguageOverride ?? ''} onChange={async (event) => {
        await database.setTargetLanguageOverride((event.target.value || null) as SupportedLanguage | null);
        setPendingRating(null);
        await refresh();
      }}>
        <option value="">{formatMobileText(t.followPc, { language: learning.pcTargetLanguage ? NATIVE_LANGUAGE_LABELS[learning.pcTargetLanguage] : '—' })}</option>
        {learning.availableTargetLanguages.map((item) => <option key={item} value={item}>{NATIVE_LANGUAGE_LABELS[item]}</option>)}
      </select></label>
      <div className="segmented">
        <button className={config.connection_mode === 'auto' ? 'active' : ''} onClick={() => void changeTransport('auto')}>{t.autoConnection}</button>
        <button className={config.connection_mode === 'lan' ? 'active' : ''} disabled={!config.lan_url} onClick={() => void changeTransport('lan')}>{t.lan}</button>
        <button className={config.connection_mode === 'tailscale' ? 'active' : ''} disabled={!config.tailscale_url} onClick={() => void changeTransport('tailscale')}>{t.tailscale}</button>
      </div>
      {config.last_successful_transport ? <p className="muted">{formatMobileText(t.connectedVia, { transport: config.last_successful_transport === 'lan' ? t.lan : t.tailscale })}</p> : null}
      <p className="muted">{t.lastSync}: {config.last_sync_at ? new Date(config.last_sync_at).toLocaleString(mobileLocale(language)) : t.never}</p>
      <label>{t.lanAddress}<div className="inline-input"><input value={lanAddress} onChange={(event) => setLanAddress(event.target.value)} placeholder="https://192.168.1.2:3109" /><button className="secondary" onClick={async () => { await database.updateConnection({ serverId: config.server_id!, lanUrl: lanAddress.trim() }); await refresh(); }}>{t.apply}</button></div></label>
      {languageSelector}
      <details><summary>{t.updateConnection}</summary><button className="secondary" onClick={async () => { try { setProfileText(await scanValue()); } catch (error) { setError(error); } }}>{t.scanProfile}</button><textarea value={profileText} onChange={(event) => setProfileText(event.target.value)} rows={5} /><button className="secondary" onClick={() => void updateProfile()}>{t.save}</button></details>
      <button className="danger" onClick={async () => { await syncClient.unpair(); await refresh(); }}>{t.unpair}</button>
    </section>
  </main>;
}
