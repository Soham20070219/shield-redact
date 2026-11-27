import { SlidersHorizontal } from 'lucide-react';
import { PII_CATEGORIES, type PIICategory } from '../utils/piiEngine';
import { CATEGORY_THEME } from '../utils/categoryTheme';

interface CategoryFilterBarProps {
  enabledCategories: Record<PIICategory, boolean>;
  onToggleCategory: (category: PIICategory) => void;
  onSetAll: (enabled: boolean) => void;
}

export function CategoryFilterBar({
  enabledCategories,
  onToggleCategory,
  onSetAll,
}: CategoryFilterBarProps) {
  const allEnabled = PII_CATEGORIES.every((c) => enabledCategories[c]);
  const noneEnabled = PII_CATEGORIES.every((c) => !enabledCategories[c]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Detectors
        </span>

        {PII_CATEGORIES.map((category) => {
          const active = enabledCategories[category];
          const theme = CATEGORY_THEME[category];

          return (
            <button
              key={category}
              type="button"
              onClick={() => onToggleCategory(category)}
              aria-pressed={active}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                active
                  ? theme.toggleActiveClass
                  : 'border-slate-800 bg-slate-950/60 text-slate-500 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full transition-opacity ${theme.dotClass} ${
                  active ? 'opacity-100' : 'opacity-30'
                }`}
              />
              <span>{theme.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => onSetAll(true)}
          disabled={allEnabled}
          className="cursor-pointer rounded-md border border-slate-700/70 bg-slate-800/60 px-2.5 py-1 text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Enable All
        </button>
        <button
          type="button"
          onClick={() => onSetAll(false)}
          disabled={noneEnabled}
          className="cursor-pointer rounded-md border border-slate-700/70 bg-slate-800/60 px-2.5 py-1 text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Disable All
        </button>
      </div>
    </div>
  );
}
