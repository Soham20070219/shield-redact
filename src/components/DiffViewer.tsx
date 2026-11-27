import { useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Eye, ShieldAlert, ShieldOff } from 'lucide-react';
import type { PIICandidate, RedactedToken } from '../utils/piiEngine';
import { CATEGORY_THEME } from '../utils/categoryTheme';

interface DiffViewerProps {
  originalText: string;
  sanitizedText: string;
  detections: PIICandidate[];
  tokens: RedactedToken[];
}

interface HoveredTip {
  label: string;
  subLabel: string;
  replacement: string;
  x: number;
  y: number;
}

export function DiffViewer({
  originalText,
  sanitizedText,
  detections,
  tokens,
}: DiffViewerProps) {
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef<'left' | 'right' | null>(null);
  const [tooltip, setTooltip] = useState<HoveredTip | null>(null);

  const handleSyncScroll = (source: 'left' | 'right') => {
    if (syncingRef.current && syncingRef.current !== source) {
      return;
    }

    const fromEl = source === 'left' ? leftScrollRef.current : rightScrollRef.current;
    const toEl = source === 'left' ? rightScrollRef.current : leftScrollRef.current;
    if (!fromEl || !toEl) {
      return;
    }

    syncingRef.current = source;
    const maxFromScrollTop = Math.max(1, fromEl.scrollHeight - fromEl.clientHeight);
    const maxToScrollTop = Math.max(0, toEl.scrollHeight - toEl.clientHeight);
    const ratio = fromEl.scrollTop / maxFromScrollTop;
    toEl.scrollTop = ratio * maxToScrollTop;

    const maxFromScrollLeft = Math.max(1, fromEl.scrollWidth - fromEl.clientWidth);
    const maxToScrollLeft = Math.max(0, toEl.scrollWidth - toEl.clientWidth);
    if (maxFromScrollLeft > 1) {
      toEl.scrollLeft = (fromEl.scrollLeft / maxFromScrollLeft) * maxToScrollLeft;
    }

    requestAnimationFrame(() => {
      syncingRef.current = null;
    });
  };

  const renderOriginalHighlighted = (): ReactNode => {
    if (!originalText) {
      return null;
    }
    if (tokens.length === 0) {
      return <span>{originalText}</span>;
    }

    const parts: ReactNode[] = [];
    let cursor = 0;

    tokens.forEach((token, idx) => {
      if (token.start > cursor) {
        parts.push(
          <span key={`orig-plain-${idx}`}>{originalText.slice(cursor, token.start)}</span>
        );
      }

      const theme = CATEGORY_THEME[token.type];
      const subLabel =
        token.type === 'CREDIT_CARD' && token.metadata?.luhnVerified
          ? 'Luhn Verified'
          : token.metadata?.ipVersion ?? 'Validated Match';

      parts.push(
        <mark
          key={`orig-mark-${idx}-${token.start}`}
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltip({
              label: theme.label,
              subLabel,
              replacement: token.replacement,
              x: rect.left + rect.width / 2,
              y: rect.top,
            });
          }}
          onMouseLeave={() => setTooltip(null)}
          className={`cursor-help rounded-xs px-1 py-0.5 transition-colors ${theme.highlightClass}`}
        >
          {token.value}
        </mark>
      );

      cursor = token.end;
    });

    if (cursor < originalText.length) {
      parts.push(<span key="orig-tail">{originalText.slice(cursor)}</span>);
    }

    return parts;
  };

  const renderSanitizedHighlighted = (): ReactNode => {
    if (!sanitizedText) {
      return null;
    }
    if (tokens.length === 0) {
      return <span>{sanitizedText}</span>;
    }

    const parts: ReactNode[] = [];
    let cursor = 0;

    tokens.forEach((token, idx) => {
      if (token.outStart > cursor) {
        parts.push(
          <span key={`san-plain-${idx}`}>{sanitizedText.slice(cursor, token.outStart)}</span>
        );
      }

      const theme = CATEGORY_THEME[token.type];
      parts.push(
        <span
          key={`san-tok-${idx}-${token.outStart}`}
          title={`${theme.label} replacement`}
          className={`inline-block rounded-xs px-1.5 py-0.5 font-semibold ${theme.replacementClass}`}
        >
          {token.replacement}
        </span>
      );

      cursor = token.outEnd;
    });

    if (cursor < sanitizedText.length) {
      parts.push(<span key="san-tail">{sanitizedText.slice(cursor)}</span>);
    }

    return parts;
  };

  if (!originalText) {
    return (
      <section
        aria-label="Side-by-side diff view"
        className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center"
      >
        <div className="mb-3 rounded-full border border-slate-800 bg-slate-950 p-3 text-cyan-400">
          <Eye className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">
          No Document Loaded Yet
        </h3>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-400">
          Paste logs, support tickets, or CSV records above, drop a{' '}
          <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-200">.txt</code> /{' '}
          <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-200">.csv</code> file, or click{' '}
          <span className="font-medium text-cyan-300">Load Sample Noisy Data</span> to inspect live PII detection and side-by-side redaction.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Side-by-side diff view" className="relative">
      {tooltip && (
        <div
          role="tooltip"
          style={{
            left: `${tooltip.x}px`,
            top: `${Math.max(12, tooltip.y - 10)}px`,
          }}
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center gap-2 font-semibold text-slate-100">
            <span>{tooltip.label}</span>
            {tooltip.subLabel === 'Luhn Verified' && (
              <span className="inline-flex items-center gap-1 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                <CheckCircle2 className="h-3 w-3" />
                Luhn Verified
              </span>
            )}
            {tooltip.subLabel !== 'Luhn Verified' && (
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                {tooltip.subLabel}
              </span>
            )}
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-400">
            → <span className="text-slate-200">{tooltip.replacement}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Panel: Original Input with Detections */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-800/90 bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Original Input with Detections
              </h3>
            </div>
            <span className="rounded-md bg-slate-800/80 px-2 py-0.5 font-mono text-[11px] text-slate-300">
              {detections.length} {detections.length === 1 ? 'entity' : 'entities'}
            </span>
          </div>

          <div
            ref={leftScrollRef}
            onScroll={() => handleSyncScroll('left')}
            className="custom-scrollbar h-[380px] overflow-auto p-4 font-mono text-xs leading-6 whitespace-pre-wrap break-words text-slate-300"
          >
            {renderOriginalHighlighted()}
          </div>
        </div>

        {/* Right Panel: Sanitized Output */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-800/90 bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <ShieldOff className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Sanitized Output
              </h3>
            </div>
            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-300">
              {detections.length > 0 ? 'Sanitized' : 'Clean Input'}
            </span>
          </div>

          <div
            ref={rightScrollRef}
            onScroll={() => handleSyncScroll('right')}
            className="custom-scrollbar h-[380px] overflow-auto p-4 font-mono text-xs leading-6 whitespace-pre-wrap break-words text-slate-200"
          >
            {renderSanitizedHighlighted()}
          </div>
        </div>
      </div>
    </section>
  );
}
