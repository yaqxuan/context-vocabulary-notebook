import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  ImportConflictDecision,
  ImportConflictDto,
  ImportExecuteDecisionDto,
  ImportExecuteResponseDto,
  ImportScanResponseDto,
  SettingsDto,
} from '../../shared/types';
import { exportCards, executeImport, scanImport } from '../api/importExport';
import { getSettings, patchSettings } from '../api/settings';
import { Button } from '../components/Button';
import { ErrorState, LoadingState } from '../components/UiStates';

// ─── Type helpers ─────────────────────────────────────────────────────────────

type DecisionMode = 'skip_all' | 'merge_all' | 'import_all_as_new' | 'per_item';

// ─── Settings form ────────────────────────────────────────────────────────────

interface SettingsFormProps {
  initial: SettingsDto;
  onSaved: (updated: SettingsDto) => void;
}

function SettingsForm({ initial, onSaved }: SettingsFormProps) {
  const [interfaceLang, setInterfaceLang] = useState(initial.interface_language);
  const [targetLang, setTargetLang] = useState(initial.default_target_language);
  const [defLang, setDefLang] = useState(initial.default_definition_language);
  const [dailyLimit, setDailyLimit] = useState(String(initial.daily_review_limit));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function validateDailyLimit(value: string): boolean {
    const n = Number(value);
    if (!value.trim() || !Number.isInteger(n) || n <= 0) {
      setValidationError('每日复习数量必须是正整数');
      return false;
    }
    setValidationError(null);
    return true;
  }

  async function handleSave() {
    if (!validateDailyLimit(dailyLimit)) return;
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
      setSaved(true);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="phase7-settings-section">
      <h2 className="phase7-settings-section-title">基本设置</h2>

      <div className="phase7-settings-form">
        <div className="phase7-settings-field">
          <label htmlFor="setting-interface-lang" className="phase7-settings-label">
            界面语言
          </label>
          <input
            id="setting-interface-lang"
            className="phase7-settings-input"
            type="text"
            value={interfaceLang}
            onChange={(e) => setInterfaceLang(e.target.value)}
          />
        </div>

        <div className="phase7-settings-field">
          <label htmlFor="setting-target-lang" className="phase7-settings-label">
            默认学习语言
          </label>
          <input
            id="setting-target-lang"
            className="phase7-settings-input"
            type="text"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          />
        </div>

        <div className="phase7-settings-field">
          <label htmlFor="setting-def-lang" className="phase7-settings-label">
            默认释义语言
          </label>
          <input
            id="setting-def-lang"
            className="phase7-settings-input"
            type="text"
            value={defLang}
            onChange={(e) => setDefLang(e.target.value)}
          />
        </div>

        <div className="phase7-settings-field">
          <label htmlFor="setting-daily-limit" className="phase7-settings-label">
            每日复习数量
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
          保存设置
        </Button>
        {saved && <span className="phase7-settings-saved-msg">设置已保存</span>}
        {saveError && <span className="phase7-settings-save-error">{saveError}</span>}
      </div>
    </section>
  );
}

// ─── Export section ───────────────────────────────────────────────────────────

function ExportSection() {
  const [markedLoading, setMarkedLoading] = useState(false);
  const [pureLoading, setPureLoading] = useState(false);

  async function triggerDownload(type: 'marked' | 'pure') {
    const filename = type === 'marked' ? 'cvn-marked-export.zip' : 'cvn-pure-export.zip';
    const setter = type === 'marked' ? setMarkedLoading : setPureLoading;
    setter(true);
    try {
      const blob = await exportCards(type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setter(false);
    }
  }

  return (
    <section className="phase7-settings-section">
      <h2 className="phase7-settings-section-title">导出数据</h2>
      <div className="phase7-settings-export-grid">
        <div className="phase7-settings-export-card">
          <p className="phase7-settings-export-desc">
            完整备份：包含卡片、语境、媒体、标签、复习记录、FSRS 状态和设置。
          </p>
          <Button onClick={() => triggerDownload('marked')} disabled={markedLoading}>
            导出 marked 备份
          </Button>
        </div>
        <div className="phase7-settings-export-card">
          <p className="phase7-settings-export-desc">
            纯内容分享：仅包含卡片和语境，不含个人状态、收藏或复习记录。
          </p>
          <Button onClick={() => triggerDownload('pure')} disabled={pureLoading}>
            导出 pure 卡片
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
      setScanError(err instanceof Error ? err.message : '扫描失败');
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
      setExecuteError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setExecuting(false);
    }
  }

  return (
    <section className="phase7-settings-section">
      <h2 className="phase7-settings-section-title">导入数据</h2>

      <div className="phase7-settings-import-controls">
        {/* File input */}
        <div className="phase7-settings-field">
          <label htmlFor="import-file-input" className="phase7-settings-label">
            选择导入 zip
          </label>
          <input
            id="import-file-input"
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="phase7-settings-file-input"
            onChange={handleFileChange}
            aria-label="选择导入 zip"
          />
        </div>

        <div className="phase7-settings-import-btns">
          <Button onClick={handleScan} disabled={!file || scanning}>
            扫描导入文件
          </Button>
          <Button onClick={handleExecute} disabled={!scanResult || executing}>
            执行导入
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
              <span className="phase7-settings-count-label">卡片</span>
              <strong className="phase7-settings-count-value">{scanResult.counts.cards}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">语境</span>
              <strong className="phase7-settings-count-value">{scanResult.counts.contexts}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">媒体文件</span>
              <strong className="phase7-settings-count-value">{scanResult.counts.media_files}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">标签</span>
              <strong className="phase7-settings-count-value">{scanResult.counts.tags}</strong>
            </div>
          </div>

          {/* Conflicts */}
          {scanResult.conflicts.length > 0 && (
            <div className="phase7-settings-conflicts">
              <h3 className="phase7-settings-subsection-title">
                冲突 ({scanResult.conflicts.length})
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
                        value={perItem[c.import_card_id] ?? 'skip'}
                        onChange={(e) =>
                          setPerItem((prev) => ({
                            ...prev,
                            [c.import_card_id]: e.target.value as ImportConflictDecision,
                          }))
                        }
                      >
                        <option value="skip">跳过</option>
                        <option value="merge">合并</option>
                        <option value="import_as_new">作为新条目</option>
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
                缺少媒体文件 ({scanResult.missing_media.length})
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
            <h3 className="phase7-settings-subsection-title">冲突处理方式</h3>
            <div className="phase7-settings-radio-group">
              {(
                [
                  { value: 'skip_all', label: '全部跳过' },
                  { value: 'merge_all', label: '全部合并为已有词义条目的新语境' },
                  { value: 'import_all_as_new', label: '全部作为新词义条目导入' },
                  { value: 'per_item', label: '逐项处理' },
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
          <p className="phase7-settings-execute-done">导入完成</p>
          <div className="phase7-settings-result-counts">
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">已导入卡片</span>
              <strong className="phase7-settings-count-value">{executeResult.imported_cards}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">已导入语境</span>
              <strong className="phase7-settings-count-value">{executeResult.imported_contexts}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">已导入媒体</span>
              <strong className="phase7-settings-count-value">{executeResult.imported_media_files}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">已跳过</span>
              <strong className="phase7-settings-count-value">{executeResult.skipped_cards}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">已合并</span>
              <strong className="phase7-settings-count-value">{executeResult.merged_cards}</strong>
            </div>
            <div className="phase7-settings-count-item">
              <span className="phase7-settings-count-label">缺少媒体</span>
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
      <section className="phase7-settings-hero">
        <p className="phase7-settings-kicker">SETTINGS</p>
        <h1 className="phase7-settings-headline">设置与数据管理</h1>
        <p className="phase7-settings-hero-copy">
          调整界面语言、学习语言和每日复习目标，或导出 / 导入卡片数据。
        </p>
      </section>

      <SettingsForm initial={current} onSaved={setCurrent} />
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
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    getSettings()
      .then((data) => {
        setState({ kind: 'ready', data });
      })
      .catch((err: unknown) => {
        setState({ kind: 'error', message: err instanceof Error ? err.message : '无法加载设置' });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.kind === 'loading') return <LoadingState message="加载中…" />;
  if (state.kind === 'error') return <ErrorState message={state.message} onRetry={load} />;
  return <SettingsReady initial={state.data} />;
}
