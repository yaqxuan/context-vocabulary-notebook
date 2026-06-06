import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DEFAULT_DEFINITION_LANGUAGE,
  DEFAULT_INTERFACE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getNativeLanguageLabel,
  normalizeSupportedLanguage,
  type SupportedLanguage,
} from '../../shared/constants';
import type {
  AiConfigDto,
  ImportConflictDecision,
  ImportConflictDto,
  ImportExecuteDecisionDto,
  ImportExecuteResponseDto,
  ImportScanResponseDto,
  SettingsDto,
} from '../../shared/types';
import {
  createAiConfig,
  deleteAiConfig,
  listAiConfigs,
  listAiModels,
  listSavedAiConfigModels,
  patchAiConfig,
  setActiveAiConfig,
} from '../api/aiConfigs';
import { exportCards, executeImport, scanImport } from '../api/importExport';
import { getSettings, patchSettings } from '../api/settings';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../components/Button';
import { ErrorState, LoadingState } from '../components/UiStates';

// ─── Type helpers ─────────────────────────────────────────────────────────────

type DecisionMode = 'skip_all' | 'merge_all' | 'import_all_as_new' | 'per_item';

// ─── Settings form ────────────────────────────────────────────────────────────

interface SettingsFormProps {
  initial: SettingsDto;
  onSaved: (updated: SettingsDto) => void;
}

interface LanguageSelectProps {
  id: string;
  value: SupportedLanguage;
  onChange: (value: SupportedLanguage) => void;
}

function LanguageSelect({ id, value, onChange }: LanguageSelectProps) {
  return (
    <select
      id={id}
      className="phase7-settings-input"
      value={value}
      onChange={(e) => onChange(e.target.value as SupportedLanguage)}
    >
      {SUPPORTED_LANGUAGES.map((language) => (
        <option key={language} value={language}>{getNativeLanguageLabel(language)}</option>
      ))}
    </select>
  );
}

function SettingsForm({ initial, onSaved }: SettingsFormProps) {
  const { t, setLanguage } = useI18n();
  const [interfaceLang, setInterfaceLang] = useState(normalizeSupportedLanguage(initial.interface_language) ?? DEFAULT_INTERFACE_LANGUAGE);
  const [targetLang, setTargetLang] = useState(normalizeSupportedLanguage(initial.default_target_language) ?? DEFAULT_TARGET_LANGUAGE);
  const [defLang, setDefLang] = useState(normalizeSupportedLanguage(initial.default_definition_language) ?? DEFAULT_DEFINITION_LANGUAGE);
  const [dailyLimit, setDailyLimit] = useState(String(initial.daily_review_limit));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function validateAll(): boolean {
    let ok = true;
    const n = Number(dailyLimit);
    if (!dailyLimit.trim() || !Number.isInteger(n) || n <= 0) {
      setValidationError(t('settings.learning.positiveInteger'));
      ok = false;
    } else {
      setValidationError(null);
    }
    return ok;
  }

  async function handleSave() {
    if (!validateAll()) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const updated = await patchSettings({
        interface_language: interfaceLang,
        default_target_language: targetLang,
        default_definition_language: defLang,
        daily_review_limit: Number(dailyLimit),
      });
      onSaved(updated);
      setLanguage(updated.interface_language);
      setSaved(true);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t('settings.learning.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="phase7-settings-section">
      <h2 className="phase7-settings-section-title">{t('settings.learning.title')}</h2>

      <div className="phase7-settings-form">
        <div className="phase7-settings-field">
          <label htmlFor="setting-interface-lang" className="phase7-settings-label">
            {t('settings.learning.interfaceLanguage')}
          </label>
          <LanguageSelect
            id="setting-interface-lang"
            value={interfaceLang}
            onChange={setInterfaceLang}
          />
        </div>

        <div className="phase7-settings-field">
          <label htmlFor="setting-target-lang" className="phase7-settings-label">
            {t('settings.learning.targetLanguage')}
          </label>
          <LanguageSelect
            id="setting-target-lang"
            value={targetLang}
            onChange={setTargetLang}
          />
        </div>

        <div className="phase7-settings-field">
          <label htmlFor="setting-def-lang" className="phase7-settings-label">
            {t('settings.learning.defLanguage')}
          </label>
          <LanguageSelect
            id="setting-def-lang"
            value={defLang}
            onChange={setDefLang}
          />
        </div>

        <div className="phase7-settings-field">
          <label htmlFor="setting-daily-limit" className="phase7-settings-label">
            {t('settings.learning.dailyLimit')}
          </label>
          <input
            id="setting-daily-limit"
            className="phase7-settings-input"
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
          />
          {validationError && (
            <p className="phase7-settings-field-error">{validationError}</p>
          )}
        </div>
      </div>

      <div className="phase7-settings-actions">
        <Button onClick={handleSave} disabled={saving}>
          {t('common.save')}
        </Button>
        {saved && <span className="phase7-settings-saved-msg">{t('settings.learning.saved')}</span>}
        {saveError && <span className="phase7-settings-save-error">{saveError}</span>}
      </div>
    </section>
  );
}


// ─── AI config section ─────────────────────────────────────────────────────────

function AiConfigSection() {
  const { t } = useI18n();
  const [configs, setConfigs] = useState<AiConfigDto[]>([]);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [makeActive, setMakeActive] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [editingBaseUrl, setEditingBaseUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConfigs(await listAiConfigs());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const canFetchModels = Boolean(
    baseUrl.trim() && (apiKey.trim() || (editingConfigId && baseUrl.trim() === editingBaseUrl)),
  );

  function resetForm() {
    setName('');
    setBaseUrl('');
    setApiKey('');
    setModel('');
    setModelOptions([]);
    setMakeActive(false);
    setEditingConfigId(null);
    setEditingBaseUrl('');
  }

  function handleEdit(config: AiConfigDto) {
    setName(config.name);
    setBaseUrl(config.base_url);
    setApiKey('');
    setModel(config.model);
    setModelOptions([]);
    setMakeActive(Boolean(config.is_active));
    setEditingConfigId(config.id);
    setEditingBaseUrl(config.base_url);
    setSaved(false);
    setError(null);
  }

  function handleCancelEdit() {
    resetForm();
    setSaved(false);
    setError(null);
  }

  async function handleFetchModels() {
    setFetchingModels(true);
    setSaved(false);
    setError(null);
    try {
      const result = apiKey.trim()
        ? await listAiModels({ base_url: baseUrl.trim(), api_key: apiKey.trim() })
        : await listSavedAiConfigModels(editingConfigId!);
      setModelOptions(result.models);
      if (!model.trim() && result.models[0]) setModel(result.models[0]);
      if (result.models.length === 0) setError(t('settings.ai.noModels'));
    } catch (err) {
      setModelOptions([]);
      setError(err instanceof Error ? err.message : t('settings.ai.fetchModelsFailed'));
    } finally {
      setFetchingModels(false);
    }
  }

  async function handleSaveAiConfig() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      if (editingConfigId) {
        await patchAiConfig(editingConfigId, {
          name: name.trim(),
          base_url: baseUrl.trim(),
          model: model.trim(),
          ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
          is_active: makeActive,
        });
      } else {
        await createAiConfig({
          name: name.trim(),
          base_url: baseUrl.trim(),
          api_key: apiKey.trim(),
          model: model.trim(),
          is_active: makeActive,
        });
      }
      resetForm();
      setSaved(true);
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.ai.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(id: string) {
    setSaved(false);
    setError(null);
    try {
      await setActiveAiConfig(id);
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.ai.activateFailed'));
    }
  }

  async function handleDelete(id: string) {
    setSaved(false);
    setError(null);
    try {
      await deleteAiConfig(id);
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.ai.deleteFailed'));
    }
  }

  return (
    <section className="phase7-settings-section ai-settings-section">
      <h2 className="phase7-settings-section-title">{t('settings.ai.title')}</h2>
      <p className="phase7-settings-export-desc">
        {t('settings.ai.desc')}
      </p>

      {loading ? <p className="phase7-settings-export-desc">{t('settings.ai.loading')}</p> : null}
      {!loading && configs.length === 0 ? <p className="phase7-settings-export-desc">{t('settings.ai.empty')}</p> : null}

      <div className="ai-config-list">
        {configs.map((config) => (
          <div key={config.id} className="ai-config-card ai-config-card--light" data-testid={`ai-config-card-${config.id}`}>
            <div className="ai-config-main">
              <strong className="ai-config-name">{config.name}</strong>
              <div className="ai-config-meta" aria-label={config.name}>
                <span>{config.model}</span>
                <small>{config.base_url}</small>
                <small>{config.has_api_key ? t('settings.ai.keySaved') : t('settings.ai.keyNotSaved')}</small>
              </div>
            </div>
            <div className="ai-config-actions">
              {config.is_active ? (
                <span className="ai-config-active">{t('settings.ai.active')}</span>
              ) : (
                <Button aria-label={`${t('settings.ai.activate')} ${config.name}`} onClick={() => handleActivate(config.id)}>{t('settings.ai.activate')}</Button>
              )}
              <Button aria-label={`${t('settings.ai.edit')} ${config.name}`} variant="secondary" onClick={() => handleEdit(config)}>
                {t('settings.ai.edit')}
              </Button>
              <Button aria-label={`${t('settings.ai.delete')} ${config.name}`} variant="secondary" onClick={() => handleDelete(config.id)}>
                {t('settings.ai.delete')}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="phase7-settings-form ai-config-form">
        <div className="phase7-settings-field">
          <label htmlFor="ai-config-name" className="phase7-settings-label">
            {t('settings.ai.name')}
          </label>
          <input
            id="ai-config-name"
            className="phase7-settings-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="phase7-settings-field">
          <label htmlFor="ai-config-base-url" className="phase7-settings-label">
            {t('settings.ai.baseUrl')}
          </label>
          <input
            id="ai-config-base-url"
            className="phase7-settings-input"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com/v1"
          />
        </div>
        <div className="phase7-settings-field">
          <label htmlFor="ai-config-api-key" className="phase7-settings-label">
            {t('settings.ai.apiKey')}
          </label>
          <input
            id="ai-config-api-key"
            className="phase7-settings-input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div className="phase7-settings-field">
          <Button
            variant="secondary"
            onClick={handleFetchModels}
            disabled={fetchingModels || !canFetchModels}
          >
            {fetchingModels ? t('settings.ai.fetching') : t('settings.ai.fetchModels')}
          </Button>
        </div>
        <div className="phase7-settings-field">
          <label htmlFor="ai-config-model" className="phase7-settings-label">
            {t('settings.ai.model')}
          </label>
          <input
            id="ai-config-model"
            className="phase7-settings-input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="deepseek-chat"
          />
          {modelOptions.length > 0 && (
            <div className="ai-model-options" >
              {modelOptions.map((option) => (
                <button key={option} type="button" className="ai-model-option" onClick={() => setModel(option)}>
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
        <label className="phase7-settings-radio-label">
          <input
            type="checkbox"
            checked={makeActive}
            onChange={(e) => setMakeActive(e.target.checked)}
          />
          {t('settings.ai.makeActive')}
        </label>
      </div>

      <div className="phase7-settings-actions">
        <Button onClick={handleSaveAiConfig} disabled={saving}>
          {t('settings.ai.save')}
        </Button>
        {editingConfigId && (
          <Button variant="ghost" onClick={handleCancelEdit} disabled={saving}>
            {t('settings.ai.cancelEdit')}
          </Button>
        )}
        {saved && <span className="phase7-settings-saved-msg">{t('settings.ai.saved')}</span>}
        {error && <span className="phase7-settings-save-error">{error}</span>}
      </div>
    </section>
  );
}

// ─── Export section ───────────────────────────────────────────────────────────

function ExportSection() {
  const { t } = useI18n();
  const [markedLoading, setMarkedLoading] = useState(false);
  const [pureLoading, setPureLoading] = useState(false);

  async function triggerDownload(type: 'marked' | 'pure') {
    const filename = type === 'marked' ? 'cvn-marked-export.zip' : 'cvn-pure-export.zip';
    const setter = type === 'marked' ? setMarkedLoading : setPureLoading;
    setter(true);
    let url: string | null = null;
    let a: HTMLAnchorElement | null = null;
    try {
      const blob = await exportCards(type);
      url = URL.createObjectURL(blob);
      a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      try {
        a.click();
      } finally {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally {
      setter(false);
    }
  }

  return (
    <section className="phase7-settings-section">
      <h2 className="phase7-settings-section-title">{t('settings.export.title')}</h2>
      <div className="phase7-settings-export-grid">
        <div className="phase7-settings-export-card">
          <p className="phase7-settings-export-desc">
            {t('settings.export.markedDesc')}
          </p>
          <Button onClick={() => triggerDownload('marked')} disabled={markedLoading}>
            {t('settings.export.markedBtn')}
          </Button>
        </div>
        <div className="phase7-settings-export-card">
          <p className="phase7-settings-export-desc">
            {t('settings.export.pureDesc')}
          </p>
          <Button onClick={() => triggerDownload('pure')} disabled={pureLoading}>
            {t('settings.export.pureBtn')}
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── Import section ───────────────────────────────────────────────────────────

interface PerItemDecisions {
  [importCardId: string]: ImportConflictDecision;
}

function buildDecisionDto(
  mode: DecisionMode,
  conflicts: ImportConflictDto[],
  perItem: PerItemDecisions,
): ImportExecuteDecisionDto {
  if (mode === 'skip_all') return { mode: 'skip_all' };
  if (mode === 'merge_all') return { mode: 'merge_all' };
  if (mode === 'import_all_as_new') return { mode: 'import_all_as_new' };
  // per_item
  return {
    mode: 'per_item',
    items: conflicts.map((c) => ({
      import_card_id: c.import_card_id,
      decision: perItem[c.import_card_id] ?? 'skip',
    })),
  };
}

function ImportSection() {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ImportScanResponseDto | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [mode, setMode] = useState<DecisionMode>('skip_all');
  const [perItem, setPerItem] = useState<PerItemDecisions>({});

  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<ImportExecuteResponseDto | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setScanResult(null);
    setScanError(null);
    setExecuteResult(null);
    setExecuteError(null);
  }

  async function handleScan() {
    if (!file) return;
    setScanning(true);
    setScanResult(null);
    setScanError(null);
    setExecuteResult(null);
    try {
      const result = await scanImport(file);
      setScanResult(result);
      // Initialize per-item decisions to default 'skip'
      const initial: PerItemDecisions = {};
      for (const c of result.conflicts) {
        initial[c.import_card_id] = 'skip';
      }
      setPerItem(initial);
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : t('settings.import.scanFailed'));
    } finally {
      setScanning(false);
    }
  }

  async function handleExecute() {
    if (!file || !scanResult) return;
    setExecuting(true);
    setExecuteResult(null);
    setExecuteError(null);
    try {
      const decision = buildDecisionDto(mode, scanResult.conflicts, perItem);
      const result = await executeImport(file, decision);
      setExecuteResult(result);
    } catch (err: unknown) {
      setExecuteError(err instanceof Error ? err.message : t('settings.import.executeFailed'));
    } finally {
      setExecuting(false);
    }
  }

  return (
    <section className="phase7-settings-section">
      <h2 className="phase7-settings-section-title">{t('settings.import.title')}</h2>

      <div className="phase7-settings-import-controls">
        {/* File input */}
        <div className="phase7-settings-field">
          <label htmlFor="import-file-input" className="phase7-settings-label">
            {t('settings.import.fileSelect')}
          </label>
          <input
            id="import-file-input"
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="phase7-settings-file-input"
            onChange={handleFileChange}
            aria-label={t('settings.import.fileSelect')}
          />
        </div>

        <div className="phase7-settings-import-btns">
          <Button onClick={handleScan} disabled={!file || scanning}>
            {t('settings.import.scan')}
          </Button>
          <Button onClick={handleExecute} disabled={!scanResult || executing}>
            {t('settings.import.execute')}
          </Button>
        </div>

        {scanError && (
          <p className="phase7-settings-import-error" role="alert">
            {scanError}
          </p>
        )}
      </div>

      {/* Scan results */}
      {scanResult && (
        <div className="phase7-settings-scan-result">
          {/* Counts */}
          <div className="phase7-settings-scan-counts">
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">{t('settings.import.cards')}</span>
              <strong className="phase7-settings-count-value">{scanResult.counts.cards}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">{t('settings.import.contexts')}</span>
              <strong className="phase7-settings-count-value">{scanResult.counts.contexts}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">{t('settings.import.media')}</span>
              <strong className="phase7-settings-count-value">{scanResult.counts.media_files}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">{t('settings.import.tags')}</span>
              <strong className="phase7-settings-count-value">{scanResult.counts.tags}</strong>
            </div>
          </div>

          {/* Conflicts */}
          {scanResult.conflicts.length > 0 && (
            <div className="phase7-settings-conflicts">
              <h3 className="phase7-settings-subsection-title">
                {t('settings.import.conflicts')} ({scanResult.conflicts.length})
              </h3>
              <ul className="phase7-settings-conflict-list">
                {scanResult.conflicts.map((c) => (
                  <li key={c.import_card_id} className="phase7-settings-conflict-item">
                    <span className="phase7-settings-conflict-word">{c.target_word}</span>
                    <span className="phase7-settings-conflict-sep"> — </span>
                    <span className="phase7-settings-conflict-meaning">{c.context_meaning}</span>
                    {mode === 'per_item' && (
                      <select
                        className="phase7-settings-conflict-select"
                        aria-label={`${t('settings.import.conflictWord')}${c.target_word}`}
                        value={perItem[c.import_card_id] ?? 'skip'}
                        onChange={(e) =>
                          setPerItem((prev) => ({
                            ...prev,
                            [c.import_card_id]: e.target.value as ImportConflictDecision,
                          }))
                        }
                      >
                        <option value="skip">{t('settings.import.skip')}</option>
                        <option value="merge">{t('settings.import.merge')}</option>
                        <option value="import_as_new">{t('settings.import.importAsNew')}</option>
                      </select>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing media */}
          {scanResult.missing_media.length > 0 && (
            <div className="phase7-settings-missing-media">
              <h3 className="phase7-settings-subsection-title">
                {t('settings.import.missingMedia')} ({scanResult.missing_media.length})
              </h3>
              <ul className="phase7-settings-missing-list">
                {scanResult.missing_media.map((m) => (
                  <li key={m} className="phase7-settings-missing-item">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Decision mode selector */}
          <div className="phase7-settings-decision-modes">
            <h3 className="phase7-settings-subsection-title">{t('settings.import.modeTitle')}</h3>
            <div className="phase7-settings-radio-group">
              {(
                [
                  { value: 'skip_all', label: t('settings.import.modeSkip') },
                  { value: 'merge_all', label: t('settings.import.modeMerge') },
                  { value: 'import_all_as_new', label: t('settings.import.modeNew') },
                  { value: 'per_item', label: t('settings.import.modePerItem') },
                ] as const
              ).map(({ value, label }) => (
                <label key={value} className="phase7-settings-radio-label">
                  <input
                    type="radio"
                    name="import-decision-mode"
                    value={value}
                    checked={mode === value}
                    onChange={() => setMode(value)}
                    aria-label={label}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Execute error */}
      {executeError && (
        <p className="phase7-settings-import-error" role="alert">
          {executeError}
        </p>
      )}

      {/* Execute result */}
      {executeResult && (
        <div className="phase7-settings-execute-result">
          <p className="phase7-settings-execute-done">{t('settings.import.done')}</p>
          <div className="phase7-settings-result-counts">
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">{t('settings.import.importedCards')}</span>
              <strong className="phase7-settings-count-value">{executeResult.imported_cards}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">{t('settings.import.importedContexts')}</span>
              <strong className="phase7-settings-count-value">{executeResult.imported_contexts}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">{t('settings.import.importedMedia')}</span>
              <strong className="phase7-settings-count-value">{executeResult.imported_media_files}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">{t('settings.import.skipped')}</span>
              <strong className="phase7-settings-count-value">{executeResult.skipped_cards}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">{t('settings.import.merged')}</span>
              <strong className="phase7-settings-count-value">{executeResult.merged_cards}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">{t('settings.import.missingMedia')}</span>
              <strong className="phase7-settings-count-value">{executeResult.missing_media_files}</strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Ready page ───────────────────────────────────────────────────────────────

function SettingsReady({ initial }: { initial: SettingsDto }) {
  const [current, setCurrent] = useState(initial);

  return (
    <div className="phase7-settings-shell">
      <SettingsForm initial={current} onSaved={setCurrent} />
      <AiConfigSection />
      <ExportSection />
      <ImportSection />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: SettingsDto };

export function SettingsPage() {
  const { t } = useI18n();
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    getSettings()
      .then((data) => {
        setState({ kind: 'ready', data });
      })
      .catch((err: unknown) => {
        setState({ kind: 'error', message: err instanceof Error ? err.message : t('settings.loadFailed') });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.kind === 'loading') return <LoadingState message={t('common.loading')} />;
  if (state.kind === 'error') return <ErrorState message={state.message} onRetry={load} />;
  return <SettingsReady initial={state.data} />;
}
