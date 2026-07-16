import { useCallback, useEffect, useMemo, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import { NATIVE_LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage } from '../shared/constants.js';
import type { PairingPayload, SignedConnectionProfile } from '../shared/sync.js';
import { MobileDatabase, type MobileConfig, type MobileDueCard, type MobileProgress, type MobileTransport } from './db.js';
import { mobileTranslations } from './i18n.js';
import { MobileSyncClient, parsePairingPayload } from './syncClient.js';
import './styles.css';

const database = new MobileDatabase();
const syncClient = new MobileSyncClient(database);

export function MobileApp(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<MobileConfig | null>(null);
  const [due, setDue] = useState<MobileDueCard | null>(null);
  const [pairingText, setPairingText] = useState('');
  const [profileText, setProfileText] = useState('');
  const [lanAddress, setLanAddress] = useState('');
  const [progress, setProgress] = useState<MobileProgress>({ reviewedToday: 0, dailyLimit: 0, pendingUpload: 0 });
  const [transport, setTransport] = useState<MobileTransport>('lan');
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [message, setMessage] = useState('');
  const language = (config?.interface_language ?? '英语') as SupportedLanguage;
  const t = mobileTranslations[language] ?? mobileTranslations.英语;

  const refresh = useCallback(async () => {
    const nextConfig = await database.getConfig();
    setConfig(nextConfig);
    setLanAddress(nextConfig.lan_url ?? '');
    setDue(await database.nextDueCard());
    setProgress(await database.progress());
  }, []);

  const sync = useCallback(async (quiet = false) => {
    const current = await database.getConfig();
    if (!current.credential || busy) return;
    setBusy(true);
    if (!quiet) setMessage('');
    try {
      const result = await syncClient.syncNow();
      if (!quiet) setMessage(`Revision ${result.revision} · ↑${result.uploaded} · ↓${result.downloadedMedia}`);
      await refresh();
    } catch (error) {
      if (!quiet) setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }, [busy, refresh]);

  useEffect(() => {
    let active = true;
    void database.open().then(async () => {
      if (!active) return;
      await refresh();
      setReady(true);
      const current = await database.getConfig();
      if (current.credential) void sync(true);
    }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : String(error)));
    const listener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void sync(true);
    });
    return () => { active = false; void listener.then((handle) => handle.remove()); };
  }, []); // database and sync client are stable process singletons

  const scanValue = async (): Promise<string> => {
    const result = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
    const raw = result.barcodes[0]?.rawValue;
    if (!raw) throw new Error('No QR code was read');
    return raw;
  };

  const scan = async (): Promise<void> => {
    setMessage('');
    try {
      setPairingText(await scanValue());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const pairingPayload = useMemo<PairingPayload | null>(() => {
    try { return pairingText ? parsePairingPayload(pairingText) : null; } catch { return null; }
  }, [pairingText]);

  const pair = async (): Promise<void> => {
    setBusy(true);
    setMessage('');
    try {
      const payload = parsePairingPayload(pairingText);
      if (transport === 'lan' && !payload.lan) throw new Error('This pairing code does not contain a LAN address');
      if (transport === 'tailscale' && !payload.tailscale_url) throw new Error('This pairing code does not contain a Tailscale address');
      await syncClient.pairAndWait(payload, transport, () => setWaiting(true));
      setWaiting(false);
      await syncClient.syncNow();
      await refresh();
    } catch (error) {
      setWaiting(false);
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const review = async (rating: 'again' | 'good'): Promise<void> => {
    if (!due) return;
    setBusy(true);
    try {
      await database.submitReview(due.id, rating);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const changeTransport = async (value: MobileTransport): Promise<void> => {
    await database.setTransport(value);
    setTransport(value);
    await refresh();
  };

  const updateProfile = async (): Promise<void> => {
    try {
      await syncClient.applySignedConnectionProfile(JSON.parse(profileText) as SignedConnectionProfile);
      setProfileText('');
      await refresh();
      setMessage('Connection profile updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  if (!ready) return <main className="mobile-shell"><section className="panel"><h1>{t.app}</h1><p>{t.preparing}</p>{message && <p className="error">{message}</p>}</section></main>;

  if (!config?.credential) {
    return <main className="mobile-shell">
      <section className="panel pair-panel">
        <p className="eyebrow">{t.offline}</p><h1>{t.pairTitle}</h1><p>{t.pairHelp}</p>
        <button className="secondary" onClick={() => void scan()}>{t.scan}</button>
        <textarea value={pairingText} onChange={(event) => setPairingText(event.target.value)} rows={7} spellCheck={false} />
        <div className="segmented">
          <button className={transport === 'lan' ? 'active' : ''} disabled={!pairingPayload?.lan} onClick={() => setTransport('lan')}>{t.lan}</button>
          <button className={transport === 'tailscale' ? 'active' : ''} disabled={!pairingPayload?.tailscale_url} onClick={() => setTransport('tailscale')}>{t.tailscale}</button>
        </div>
        <button className="primary" disabled={busy || !pairingPayload} onClick={() => void pair()}>{waiting ? t.waiting : t.pair}</button>
        {message && <p className="error">{message}</p>}
      </section>
    </main>;
  }

  return <main className="mobile-shell">
    <header className="mobile-header">
      <div><p className="eyebrow">{t.offline}</p><h1>{t.app}</h1></div>
      <button className="secondary compact" disabled={busy} onClick={() => void sync()}>{busy ? t.syncing : t.sync}</button>
    </header>
    {message && <p className={message.toLowerCase().includes('error') ? 'error status' : 'status'}>{message}</p>}
    <section className="mobile-progress"><span>{t.progress}: {progress.reviewedToday} / {progress.dailyLimit || '—'}</span><span>{t.pending}: {progress.pendingUpload}</span></section>
    <section className="review-card">
      {due ? <>
        <p className="language-label">{due.target_language}</p>
        <h2>{due.target_word}</h2>
        <p className="meaning">{due.context_meaning}</p>
        {due.primary_sentence && <blockquote>{due.primary_sentence}</blockquote>}
        <div className="media-stack">
          {due.media.map((item, index) => item.local_path && item.media_type === 'image'
            ? <img key={index} src={Capacitor.convertFileSrc(item.local_path)} alt="" />
            : item.local_path && item.media_type === 'audio'
              ? <audio key={index} src={Capacitor.convertFileSrc(item.local_path)} controls />
              : item.media_type === 'video' ? <p key={index} className="muted">{t.videoUnavailable}</p> : null)}
        </div>
        <div className="review-actions"><button disabled={busy} className="again" onClick={() => void review('again')}>{t.again}</button><button disabled={busy} className="good" onClick={() => void review('good')}>{t.good}</button></div>
      </> : <div className="empty"><span>✓</span><p>{t.noDue}</p></div>}
    </section>
    <section className="panel settings-panel">
      <h3>{t.connection}</h3>
      <div className="segmented">
        <button className={config.selected_transport === 'lan' ? 'active' : ''} disabled={!config.lan_url} onClick={() => void changeTransport('lan')}>{t.lan}</button>
        <button className={config.selected_transport === 'tailscale' ? 'active' : ''} disabled={!config.tailscale_url} onClick={() => void changeTransport('tailscale')}>{t.tailscale}</button>
      </div>
      <p className="muted">{t.lastSync}: {config.last_sync_at ? new Date(config.last_sync_at).toLocaleString() : '—'}</p>
      <label>{t.lanAddress}<div className="inline-input"><input value={lanAddress} onChange={(event) => setLanAddress(event.target.value)} placeholder="https://192.168.1.2:3109" /><button className="secondary" onClick={async () => { await database.updateConnection({ serverId: config.server_id!, lanUrl: lanAddress.trim() }); await refresh(); }}>{t.apply}</button></div></label>
      <label>{t.language}<select value={language} onChange={async (event) => { await database.setInterfaceLanguage(event.target.value); await refresh(); }}>{SUPPORTED_LANGUAGES.map((item) => <option key={item} value={item}>{NATIVE_LANGUAGE_LABELS[item]}</option>)}</select></label>
      <details><summary>{t.updateConnection}</summary><button className="secondary" onClick={async () => { try { setProfileText(await scanValue()); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } }}>{t.scanProfile}</button><textarea value={profileText} onChange={(event) => setProfileText(event.target.value)} rows={5} /><button className="secondary" onClick={() => void updateProfile()}>{t.save}</button></details>
      <button className="danger" onClick={async () => { await syncClient.unpair(); await refresh(); }}>{t.unpair}</button>
    </section>
  </main>;
}
