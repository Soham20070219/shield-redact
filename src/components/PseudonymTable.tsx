import { useState } from 'react';
import { ChevronDown, ChevronRight, KeyRound } from 'lucide-react';
import type { PseudonymEntry } from '../utils/piiEngine';
import { CATEGORY_THEME } from '../utils/categoryTheme';

interface PseudonymTableProps {
  entries: PseudonymEntry[];
}

export function PseudonymTable({ entries }: PseudonymTableProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section
      aria-label="Pseudonym mapping table"
      className="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-900/70"
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition hover:bg-slate-800/40"
      >
        <div className="flex items-center gap-2.5">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
          <KeyRound className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-100">
            Pseudonym Mapping Table
          </span>
          <span className="rounded-md border border-slate-700 bg-slate-950/70 px-2 py-0.5 font-mono text-xs text-slate-300">
            {entries.length} unique {entries.length === 1 ? 'token' : 'tokens'}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {isOpen ? 'Collapse' : 'Inspect tokens'}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-slate-800/80">
          {entries.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-500">
              No PII entities detected to map. Load sample data or paste text containing PII.
            </div>
          ) : (
            <div className="custom-scrollbar max-h-72 overflow-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-slate-950/95 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="border-b border-slate-800 px-4 py-2.5">Placeholder Token</th>
                    <th className="border-b border-slate-800 px-4 py-2.5">Category</th>
                    <th className="border-b border-slate-800 px-4 py-2.5">Normalized Key</th>
                    <th className="border-b border-slate-800 px-4 py-2.5">First Observed Value</th>
                    <th className="border-b border-slate-800 px-4 py-2.5 text-right">Hits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {entries.map((entry) => {
                    const theme = CATEGORY_THEME[entry.type];
                    return (
                      <tr key={entry.token} className="hover:bg-slate-800/30">
                        <td className="px-4 py-2 font-mono font-semibold text-slate-100">
                          <span className={`rounded px-1.5 py-0.5 ${theme.replacementClass}`}>
                            {entry.token}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-0.5 text-[11px] font-medium ${theme.badgeClass}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${theme.dotClass}`} />
                            {theme.label}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono text-slate-400">
                          {entry.normalizedValue}
                        </td>
                        <td className="px-4 py-2 font-mono text-slate-300">
                          {entry.originalValue}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-semibold text-slate-200">
                          {entry.occurrences}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
