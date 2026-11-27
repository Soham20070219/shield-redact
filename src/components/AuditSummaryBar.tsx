import { Lock, ShieldCheck, Activity } from 'lucide-react';
import { PII_CATEGORIES, type PIICategory } from '../utils/piiEngine';
import { CATEGORY_THEME } from '../utils/categoryTheme';

interface AuditSummaryBarProps {
  totalDetections: number;
  countsByCategory: Record<PIICategory, number>;
  enabledCategories: Record<PIICategory, boolean>;
  durationMs: number;
}

export function AuditSummaryBar({
  totalDetections,
  countsByCategory,
  enabledCategories,
  durationMs,
}: AuditSummaryBarProps) {
  return (
    <section
      aria-label="Audit summary"
      className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-4 backdrop-blur-sm"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-700/80 bg-slate-950/80 px-3.5 py-2">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Detected PII
              </div>
              <div className="text-lg font-bold leading-tight text-slate-50" data-testid="total-detections">
                {totalDetections}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PII_CATEGORIES.map((category) => {
              const theme = CATEGORY_THEME[category];
              const count = countsByCategory[category] ?? 0;
              const isEnabled = enabledCategories[category];

              return (
                <div
                  key={category}
                  className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-opacity ${
                    theme.badgeClass
                  } ${!isEnabled ? 'opacity-40 grayscale' : ''}`}
                >
                  <span className={`h-2 w-2 rounded-full ${theme.dotClass}`} />
                  <span>{theme.shortLabel}</span>
                  <span className="rounded bg-slate-950/60 px-1.5 py-0.5 font-mono text-[11px] font-semibold">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-xs text-slate-400">
            <Activity className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-mono">{durationMs.toFixed(2)} ms</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
            <Lock className="h-3.5 w-3.5" />
            <span>100% Client-Side • Offline Safe</span>
          </div>
        </div>
      </div>
    </section>
  );
}
