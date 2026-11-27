import type { PIICategory } from './piiEngine';

export interface CategoryStyle {
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotClass: string;
  highlightClass: string;
  replacementClass: string;
  toggleActiveClass: string;
  borderAccent: string;
}

export const CATEGORY_THEME: Record<PIICategory, CategoryStyle> = {
  EMAIL: {
    label: 'Email',
    shortLabel: 'Emails',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    dotClass: 'bg-blue-400',
    highlightClass:
      'bg-blue-500/20 text-blue-200 border-b-2 border-blue-400 hover:bg-blue-500/35',
    replacementClass:
      'bg-blue-500/20 text-blue-200 border border-blue-400/40',
    toggleActiveClass:
      'bg-blue-500/15 text-blue-200 border-blue-500/50 shadow-[0_0_12px_-4px_rgba(59,130,246,0.5)]',
    borderAccent: 'border-blue-500/40',
  },
  PHONE: {
    label: 'Phone',
    shortLabel: 'Phones',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dotClass: 'bg-emerald-400',
    highlightClass:
      'bg-emerald-500/20 text-emerald-200 border-b-2 border-emerald-400 hover:bg-emerald-500/35',
    replacementClass:
      'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40',
    toggleActiveClass:
      'bg-emerald-500/15 text-emerald-200 border-emerald-500/50 shadow-[0_0_12px_-4px_rgba(16,185,129,0.5)]',
    borderAccent: 'border-emerald-500/40',
  },
  IP: {
    label: 'IP Address',
    shortLabel: 'IPs',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    dotClass: 'bg-purple-400',
    highlightClass:
      'bg-purple-500/20 text-purple-200 border-b-2 border-purple-400 hover:bg-purple-500/35',
    replacementClass:
      'bg-purple-500/20 text-purple-200 border border-purple-400/40',
    toggleActiveClass:
      'bg-purple-500/15 text-purple-200 border-purple-500/50 shadow-[0_0_12px_-4px_rgba(168,85,247,0.5)]',
    borderAccent: 'border-purple-500/40',
  },
  PAN: {
    label: 'Indian PAN',
    shortLabel: 'PAN',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dotClass: 'bg-amber-400',
    highlightClass:
      'bg-amber-500/20 text-amber-200 border-b-2 border-amber-400 hover:bg-amber-500/35',
    replacementClass:
      'bg-amber-500/20 text-amber-200 border border-amber-400/40',
    toggleActiveClass:
      'bg-amber-500/15 text-amber-200 border-amber-500/50 shadow-[0_0_12px_-4px_rgba(245,158,11,0.5)]',
    borderAccent: 'border-amber-500/40',
  },
  AADHAAR: {
    label: 'Aadhaar',
    shortLabel: 'Aadhaar',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    dotClass: 'bg-rose-400',
    highlightClass:
      'bg-rose-500/20 text-rose-200 border-b-2 border-rose-400 hover:bg-rose-500/35',
    replacementClass:
      'bg-rose-500/20 text-rose-200 border border-rose-400/40',
    toggleActiveClass:
      'bg-rose-500/15 text-rose-200 border-rose-500/50 shadow-[0_0_12px_-4px_rgba(244,63,94,0.5)]',
    borderAccent: 'border-rose-500/40',
  },
  CREDIT_CARD: {
    label: 'Credit Card',
    shortLabel: 'Cards',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    dotClass: 'bg-cyan-400',
    highlightClass:
      'bg-cyan-500/20 text-cyan-200 border-b-2 border-cyan-400 hover:bg-cyan-500/35',
    replacementClass:
      'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40',
    toggleActiveClass:
      'bg-cyan-500/15 text-cyan-200 border-cyan-500/50 shadow-[0_0_12px_-4px_rgba(6,182,212,0.5)]',
    borderAccent: 'border-cyan-500/40',
  },
};
