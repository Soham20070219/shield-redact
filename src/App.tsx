import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  EyeOff,
  Fingerprint,
  Layers,
  Shield,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import {
  PII_CATEGORIES,
  sanitizeText,
  type PIICategory,
  type RedactionMode,
} from './utils/piiEngine';
import { SAMPLE_NOISY_DATA } from './utils/sampleData';
import { AuditSummaryBar } from './components/AuditSummaryBar';
import { CategoryFilterBar } from './components/CategoryFilterBar';
import { InputWorkspace } from './components/InputWorkspace';
import { DiffViewer } from './components/DiffViewer';
import { PseudonymTable } from './components/PseudonymTable';
import { ExportControls } from './components/ExportControls';

const DEFAULT_ENABLED_CATEGORIES: Record<PIICategory, boolean> = {
  EMAIL: true,
  PHONE: true,
  IP: true,
  PAN: true,
  AADHAAR: true,
  CREDIT_CARD: true,
};

const MODE_OPTIONS: Array<{
  id: RedactionMode;
  label: string;
  description: string;
  icon: typeof EyeOff;
}> = [
  {
    id: 'full',
    label: 'Full Mask',
    description: 'Replace with [REDACTED]',
    icon: EyeOff,
  },
  {
    id: 'partial',
    label: 'Partial Mask',
    description: 'Retain safe verification context',
    icon: Layers,
  },
  {
    id: 'pseudonym',
    label: 'Consistent Pseudonymization',
    description: 'Deterministic token map (EMAIL_01)',
    icon: Fingerprint,
  },
];

export function App() {
  const [rawText, setRawText] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<RedactionMode>('partial');
  const [showCategoryTagsInFullMask, setShowCategoryTagsInFullMask] = useState<boolean>(true);
  const [enabledCategories, setEnabledCategories] = useState<Record<PIICategory, boolean>>(
    DEFAULT_ENABLED_CATEGORIES
  );
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);

  const showToast = (message: string, kind: 'success' | 'error' = 'success') => {
    setToast({ message, kind });
    window.setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 2800);
  };

  const result = useMemo(
    () =>
      sanitizeText(rawText, {
        mode,
        enabledCategories,
        showCategoryTagsInFullMask,
      }),
    [rawText, mode, enabledCategories, showCategoryTagsInFullMask]
  );

  const handleToggleCategory = (category: PIICategory) => {
    setEnabledCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSetAllCategories = (enabled: boolean) => {
    const next = {} as Record<PIICategory, boolean>;
    for (const cat of PII_CATEGORIES) {
      next[cat] = enabled;
    }
    setEnabledCategories(next);
  };

  const handleLoadSample = () => {
    setRawText(SAMPLE_NOISY_DATA);
    setUploadedFileName(null);
    showToast('Loaded synthetic multi-format sample dataset');
  };

  const handleFileLoaded = (content: string, name: string) => {
    setRawText(content);
    setUploadedFileName(name);
    showToast(`Loaded "${name}" locally via FileReader`);
  };

  const handleClear = () => {
    setRawText('');
    setUploadedFileName(null);
  };

  const handleCopy = async () => {
    if (!result.sanitizedText) return;
    try {
      await navigator.clipboard.writeText(result.sanitizedText);
      setCopied(true);
      showToast('Sanitized text copied to clipboard');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Clipboard permission denied by browser', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Subtle top ambient gradient */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-gradient-to-b from-cyan-500/8 via-slate-950/0 to-transparent" />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed right-5 bottom-5 z-50 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-2xl backdrop-blur-md transition-all ${
            toast.kind === 'error'
              ? 'border-rose-500/50 bg-rose-950/90 text-rose-200'
              : 'border-emerald-500/40 bg-slate-900/95 text-emerald-200'
          }`}
        >
          {toast.kind === 'error' ? (
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/40 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 shadow-lg shadow-cyan-500/10">
              <Shield className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-50">
                  ShieldRedact
                </h1>
                <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                  Zero-Network
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Client-side PII detection, Luhn &amp; boundary validation, and deterministic sanitization
              </p>
            </div>
          </div>

          <ExportControls
            result={result}
            mode={mode}
            enabledCategories={enabledCategories}
            uploadedFileName={uploadedFileName}
            copied={copied}
            onCopy={handleCopy}
          />
        </header>

        {/* Top Audit Summary Bar */}
        <AuditSummaryBar
          totalDetections={result.totalDetections}
          countsByCategory={result.countsByCategory}
          enabledCategories={enabledCategories}
          durationMs={result.durationMs}
        />

        {/* Input & Sample Loader */}
        <InputWorkspace
          rawText={rawText}
          fileName={uploadedFileName}
          onTextChange={(next) => setRawText(next)}
          onFileLoaded={handleFileLoaded}
          onLoadSample={handleLoadSample}
          onClear={handleClear}
          onError={(msg) => showToast(msg, 'error')}
        />

        {/* Redaction Mode Switcher + Category Toggles */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-800/90 bg-slate-900/60 p-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Redaction Mode
              </span>
              <div
                role="radiogroup"
                aria-label="Redaction mode"
                className="flex flex-wrap gap-2"
              >
                {MODE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = mode === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setMode(option.id)}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all ${
                        active
                          ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-100 shadow-[0_0_16px_-6px_rgba(6,182,212,0.5)]'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${active ? 'text-cyan-300' : 'text-slate-500'}`}
                      />
                      <div>
                        <div className="text-xs font-semibold leading-none">
                          {option.label}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {mode === 'full' && (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={showCategoryTagsInFullMask}
                  onChange={(e) => setShowCategoryTagsInFullMask(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 accent-cyan-500"
                />
                <Tag className="h-3.5 w-3.5 text-cyan-400" />
                <span>Show category tags (e.g. [REDACTED_EMAIL])</span>
              </label>
            )}
          </div>

          <CategoryFilterBar
            enabledCategories={enabledCategories}
            onToggleCategory={handleToggleCategory}
            onSetAll={handleSetAllCategories}
          />
        </div>

        {/* Live Side-by-Side Diff View */}
        <DiffViewer
          originalText={result.originalText}
          sanitizedText={result.sanitizedText}
          detections={result.detections}
          tokens={result.tokens}
        />

        {/* Collapsible Pseudonym Mapping Table */}
        {mode === 'pseudonym' && (
          <PseudonymTable entries={result.pseudonymMap} />
        )}
      </div>
    </div>
  );
}

export default App;
