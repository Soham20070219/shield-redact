export type PIICategory =
  | 'CREDIT_CARD'
  | 'AADHAAR'
  | 'PHONE'
  | 'EMAIL'
  | 'PAN'
  | 'IP';

export type RedactionMode = 'full' | 'partial' | 'pseudonym';

export interface PIICandidate {
  start: number;
  end: number;
  value: string;
  type: PIICategory;
  metadata?: {
    luhnVerified?: boolean;
    ipVersion?: 'IPv4' | 'IPv6';
  };
}

export interface RedactedToken extends PIICandidate {
  replacement: string;
  outStart: number;
  outEnd: number;
}

export interface PseudonymEntry {
  token: string;
  type: PIICategory;
  normalizedValue: string;
  originalValue: string;
  occurrences: number;
}

export interface SanitizationResult {
  originalText: string;
  sanitizedText: string;
  detections: PIICandidate[];
  tokens: RedactedToken[];
  countsByCategory: Record<PIICategory, number>;
  totalDetections: number;
  pseudonymMap: PseudonymEntry[];
  durationMs: number;
}

export interface SanitizationOptions {
  mode: RedactionMode;
  enabledCategories: Record<PIICategory, boolean>;
  showCategoryTagsInFullMask?: boolean;
}

export const PII_CATEGORIES: PIICategory[] = [
  'EMAIL',
  'PHONE',
  'IP',
  'PAN',
  'AADHAAR',
  'CREDIT_CARD',
];

/**
 * Overlap resolution priority:
 * Credit Card > Aadhaar > Phone > Email > PAN > IP
 */
export const CATEGORY_PRIORITY: Record<PIICategory, number> = {
  CREDIT_CARD: 6,
  AADHAAR: 5,
  PHONE: 4,
  EMAIL: 3,
  PAN: 2,
  IP: 1,
};

export const CATEGORY_LABELS: Record<PIICategory, string> = {
  EMAIL: 'Email',
  PHONE: 'Phone',
  IP: 'IP Address',
  PAN: 'Indian PAN',
  AADHAAR: 'Aadhaar',
  CREDIT_CARD: 'Credit Card',
};

const FULL_MASK_TAGS: Record<PIICategory, string> = {
  EMAIL: '[REDACTED_EMAIL]',
  PHONE: '[REDACTED_PHONE]',
  IP: '[REDACTED_IP]',
  PAN: '[REDACTED_PAN]',
  AADHAAR: '[REDACTED_AADHAAR]',
  CREDIT_CARD: '[REDACTED_CARD]',
};

const PSEUDONYM_PREFIX: Record<PIICategory, string> = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  IP: 'IP',
  PAN: 'PAN',
  AADHAAR: 'AADHAAR',
  CREDIT_CARD: 'CARD',
};

/**
 * Validates a numeric string using the Luhn checksum algorithm.
 * Expects 13-19 digits after stripping spaces and hyphens.
 */
export function isValidLuhn(input: string): boolean {
  const digits = input.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(digits)) {
    return false;
  }
  // Reject trivial all-zero sequences that mathematically satisfy mod 10
  if (/^0+$/.test(digits)) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = digits.charCodeAt(i) - 48;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Validates that an IPv4 string has exactly 4 octets, each strictly 0-255,
 * with no leading-zero ambiguity (e.g., 010 is rejected, single 0 is allowed).
 */
export function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return false;
  }
  return parts.every((octet) => /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(octet));
}

/**
 * Validates IPv6 addresses (full 8-hextet and :: compressed forms),
 * rejecting timestamps like 10:00:21 or bare colons.
 */
export function isValidIPv6(ip: string): boolean {
  if (!ip.includes(':') || ip.includes(':::')) {
    return false;
  }
  // Reject leading or trailing single colon (e.g. ":1" or "2001:")
  if (/^:[^:]|[^:]:$/.test(ip)) {
    return false;
  }

  const doubleColonParts = ip.split('::');
  if (doubleColonParts.length > 2) {
    return false;
  }

  const isHexGroup = (g: string) => /^[0-9a-fA-F]{1,4}$/.test(g);

  if (doubleColonParts.length === 1) {
    const groups = ip.split(':');
    if (groups.length === 8) {
      return groups.every(isHexGroup);
    }
    // IPv4-mapped IPv6 without :: (e.g. 0:0:0:0:0:ffff:192.0.2.128)
    if (groups.length === 7 && isValidIPv4(groups[6])) {
      return groups.slice(0, 6).every(isHexGroup);
    }
    return false;
  }

  const [leftRaw, rightRaw] = doubleColonParts;
  const left = leftRaw ? leftRaw.split(':') : [];
  const right = rightRaw ? rightRaw.split(':') : [];

  // Require at least one non-empty group (rejects bare "::")
  if (left.length + right.length === 0) {
    return false;
  }

  const lastRight = right[right.length - 1];
  if (lastRight && lastRight.includes('.')) {
    if (!isValidIPv4(lastRight)) {
      return false;
    }
    const hexRight = right.slice(0, -1);
    return (
      left.length + hexRight.length <= 5 &&
      left.every(isHexGroup) &&
      hexRight.every(isHexGroup)
    );
  }

  return (
    left.length + right.length <= 7 &&
    left.every(isHexGroup) &&
    right.every(isHexGroup)
  );
}

/**
 * Runs a global regex safely from lastIndex = 0 and collects matches.
 */
function collectRegexMatches(
  text: string,
  pattern: RegExp,
  onMatch: (match: RegExpExecArray) => void
): void {
  const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  regex.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[0].length === 0) {
      regex.lastIndex += 1;
      continue;
    }
    onMatch(match);
  }
}

/**
 * Collects all raw PII candidates before overlap resolution.
 */
export function detectCandidates(
  text: string,
  enabledCategories: Record<PIICategory, boolean>
): PIICandidate[] {
  const candidates: PIICandidate[] = [];

  if (!text) {
    return candidates;
  }

  // 1. Credit Cards: 13-19 digits (unspaced or grouped in 3-6 digit chunks with space/hyphen), Luhn-validated
  if (enabledCategories.CREDIT_CARD) {
    const ccPattern = /(?<![+\dA-Za-z.])(?:\d{13,19}|(?:\d{3,6}[ -]){2,4}\d{1,6})(?![\dA-Za-z@])/g;
    collectRegexMatches(text, ccPattern, (match) => {
      const value = match[0];
      const digitCount = value.replace(/[\s-]/g, '').length;
      if (digitCount >= 13 && digitCount <= 19 && isValidLuhn(value)) {
        candidates.push({
          start: match.index,
          end: match.index + value.length,
          value,
          type: 'CREDIT_CARD',
          metadata: { luhnVerified: true },
        });
      }
    });
  }

  // 2. Indian Aadhaar: 12 digits starting with 2-9, spaced/hyphenated/unspaced.
  // Lookarounds ensure no match on +91... phone numbers or substrings of 16-digit decoys.
  if (enabledCategories.AADHAAR) {
    const aadhaarPattern = /(?<![+\d])(?<!\d[ -])\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b(?![ -]\d)(?![A-Za-z0-9@])/g;
    collectRegexMatches(text, aadhaarPattern, (match) => {
      const value = match[0];
      candidates.push({
        start: match.index,
        end: match.index + value.length,
        value,
        type: 'AADHAAR',
      });
    });
  }

  // 3. Phone Numbers: Indian (+91 / 10-digit starting 6-9) & international E.164/NANP
  if (enabledCategories.PHONE) {
    // 3a. + prefixed international & +91 formats (balanced parentheses only)
    const intlPlusPhonePattern = /(?<![A-Za-z0-9+])\+\d{1,3}(?:[\s.-]?(?:\(\d{1,5}\)|\d{1,5})){1,5}(?![A-Za-z0-9@])/g;
    collectRegexMatches(text, intlPlusPhonePattern, (match) => {
      const value = match[0];
      const digits = value.replace(/\D/g, '');
      // Valid international numbers are 8 to 15 digits total
      if (digits.length >= 8 && digits.length <= 15) {
        candidates.push({
          start: match.index,
          end: match.index + value.length,
          value,
          type: 'PHONE',
        });
      }
    });

    // 3b. Indian 10-digit mobile (optional 91- or 0 prefix) without leading '+'
    const indianLocalPattern = /(?<![+\dA-Za-z.])(?<!\d[ -])(?:91[\s.-]|0)?[6-9]\d{4}[\s.-]?\d{5}(?![\dA-Za-z@])(?![ -]\d)/g;
    collectRegexMatches(text, indianLocalPattern, (match) => {
      const value = match[0];
      candidates.push({
        start: match.index,
        end: match.index + value.length,
        value,
        type: 'PHONE',
      });
    });

    // 3c. Indian 3-3-4 or NANP (xxx) xxx-xxxx / xxx-xxx-xxxx without leading '+'
    const groupedPhonePattern = /(?<![+\dA-Za-z.])(?<!\d[ -])(?:\(\d{3}\)[\s.-]?\d{3}[\s.-]?\d{4}|(?:[2-9]\d{2})[\s.-]\d{3}[\s.-]\d{4})(?![\dA-Za-z@])(?![ -]\d)/g;
    collectRegexMatches(text, groupedPhonePattern, (match) => {
      const value = match[0];
      candidates.push({
        start: match.index,
        end: match.index + value.length,
        value,
        type: 'PHONE',
      });
    });
  }

  // 4. Email
  if (enabledCategories.EMAIL) {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    collectRegexMatches(text, emailPattern, (match) => {
      const value = match[0];
      candidates.push({
        start: match.index,
        end: match.index + value.length,
        value,
        type: 'EMAIL',
      });
    });
  }

  // 5. Indian PAN: strictly 5 uppercase letters, 4 digits, 1 uppercase letter
  if (enabledCategories.PAN) {
    const panPattern = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
    collectRegexMatches(text, panPattern, (match) => {
      const value = match[0];
      candidates.push({
        start: match.index,
        end: match.index + value.length,
        value,
        type: 'PAN',
      });
    });
  }

  // 6. IP Addresses (IPv4 strictly 0-255 & IPv6)
  if (enabledCategories.IP) {
    const ipv4Pattern = /(?<![A-Za-z0-9.])(?:\d{1,3}\.){3}\d{1,3}(?![A-Za-z0-9.])/g;
    collectRegexMatches(text, ipv4Pattern, (match) => {
      const value = match[0];
      if (isValidIPv4(value)) {
        candidates.push({
          start: match.index,
          end: match.index + value.length,
          value,
          type: 'IP',
          metadata: { ipVersion: 'IPv4' },
        });
      }
    });

    const ipv6Pattern = /(?<![A-Za-z0-9:.])[0-9a-fA-F:]{2,39}(?:\.\d{1,3}){0,3}(?![A-Za-z0-9:.])/g;
    collectRegexMatches(text, ipv6Pattern, (match) => {
      const value = match[0];
      if (isValidIPv6(value)) {
        candidates.push({
          start: match.index,
          end: match.index + value.length,
          value,
          type: 'IP',
          metadata: { ipVersion: 'IPv6' },
        });
      }
    });
  }

  return candidates;
}

/**
 * Resolves overlapping candidate spans using strict category priority
 * (Credit Card > Aadhaar > Phone > Email > PAN > IP), then longer span,
 * then earlier start offset. Returns accepted detections sorted by start index.
 */
export function resolveOverlaps(candidates: PIICandidate[]): PIICandidate[] {
  const sorted = [...candidates].sort((a, b) => {
    const priorityDiff = CATEGORY_PRIORITY[b.type] - CATEGORY_PRIORITY[a.type];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    const lengthDiff = (b.end - b.start) - (a.end - a.start);
    if (lengthDiff !== 0) {
      return lengthDiff;
    }
    return a.start - b.start;
  });

  const accepted: PIICandidate[] = [];

  for (const candidate of sorted) {
    const overlaps = accepted.some(
      (existing) => candidate.start < existing.end && candidate.end > existing.start
    );
    if (!overlaps) {
      accepted.push(candidate);
    }
  }

  return accepted.sort((a, b) => a.start - b.start);
}

/**
 * Masks all digits except the last 4 with 'X', preserving separators and non-digit characters.
 */
function maskKeepLastFourDigits(value: string): string {
  const totalDigits = (value.match(/\d/g) ?? []).length;
  const digitsToMask = Math.max(0, totalDigits - 4);
  let maskedCount = 0;

  return value.replace(/\d/g, (digit) => {
    if (maskedCount < digitsToMask) {
      maskedCount += 1;
      return 'X';
    }
    return digit;
  });
}

function partialMaskValue(candidate: PIICandidate): string {
  const { value, type } = candidate;

  switch (type) {
    case 'CREDIT_CARD':
    case 'AADHAAR':
    case 'PHONE':
      return maskKeepLastFourDigits(value);

    case 'EMAIL': {
      const atIndex = value.indexOf('@');
      if (atIndex <= 0) {
        return value;
      }
      const local = value.slice(0, atIndex);
      const domain = value.slice(atIndex + 1);
      const visibleCount = local.length <= 2 ? 1 : 2;
      return `${local.slice(0, visibleCount)}***@${domain}`;
    }

    case 'PAN':
      if (value.length <= 3) {
        return '*'.repeat(value.length);
      }
      return `${value.slice(0, 2)}${'*'.repeat(value.length - 3)}${value.slice(-1)}`;

    case 'IP': {
      if (candidate.metadata?.ipVersion === 'IPv6' || value.includes(':')) {
        const segments = value.split(':');
        const head = segments.slice(0, 2).join(':');
        return `${head}:xxxx:xxxx`;
      }
      const octets = value.split('.');
      if (octets.length === 4) {
        return `${octets[0]}.${octets[1]}.xxx.xxx`;
      }
      return value;
    }
  }
}

function normalizeForPseudonym(value: string, type: PIICategory): string {
  switch (type) {
    case 'EMAIL':
    case 'IP':
      return value.trim().toLowerCase();
    case 'PAN':
      return value.trim().toUpperCase();
    case 'CREDIT_CARD':
    case 'AADHAAR':
      return value.replace(/[\s-]+/g, '');
    case 'PHONE':
      return value.replace(/[\s().-]+/g, '');
  }
}

/**
 * Executes the full PII sanitization pipeline purely client-side.
 */
export function sanitizeText(
  text: string,
  options: SanitizationOptions
): SanitizationResult {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const rawCandidates = detectCandidates(text, options.enabledCategories);
  const detections = resolveOverlaps(rawCandidates);

  const countsByCategory: Record<PIICategory, number> = {
    EMAIL: 0,
    PHONE: 0,
    IP: 0,
    PAN: 0,
    AADHAAR: 0,
    CREDIT_CARD: 0,
  };

  const pseudonymLookup = new Map<string, string>();
  const pseudonymDetails = new Map<string, PseudonymEntry>();
  const categoryCounters: Record<PIICategory, number> = {
    EMAIL: 0,
    PHONE: 0,
    IP: 0,
    PAN: 0,
    AADHAAR: 0,
    CREDIT_CARD: 0,
  };

  let sanitizedText = '';
  let cursor = 0;
  const tokens: RedactedToken[] = [];

  for (const detection of detections) {
    countsByCategory[detection.type] += 1;

    // Append untouched text before this detection
    sanitizedText += text.slice(cursor, detection.start);

    let replacement: string;
    if (options.mode === 'full') {
      replacement = options.showCategoryTagsInFullMask
        ? FULL_MASK_TAGS[detection.type]
        : '[REDACTED]';
    } else if (options.mode === 'partial') {
      replacement = partialMaskValue(detection);
    } else {
      const normalized = normalizeForPseudonym(detection.value, detection.type);
      const mapKey = `${detection.type}::${normalized}`;
      let token = pseudonymLookup.get(mapKey);

      if (!token) {
        categoryCounters[detection.type] += 1;
        const seq = String(categoryCounters[detection.type]).padStart(2, '0');
        token = `${PSEUDONYM_PREFIX[detection.type]}_${seq}`;
        pseudonymLookup.set(mapKey, token);
        pseudonymDetails.set(mapKey, {
          token,
          type: detection.type,
          normalizedValue: normalized,
          originalValue: detection.value,
          occurrences: 1,
        });
      } else {
        const existing = pseudonymDetails.get(mapKey);
        if (existing) {
          existing.occurrences += 1;
        }
      }
      replacement = token;
    }

    const outStart = sanitizedText.length;
    sanitizedText += replacement;
    const outEnd = sanitizedText.length;

    tokens.push({
      ...detection,
      replacement,
      outStart,
      outEnd,
    });

    cursor = detection.end;
  }

  sanitizedText += text.slice(cursor);

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    originalText: text,
    sanitizedText,
    detections,
    tokens,
    countsByCategory,
    totalDetections: detections.length,
    pseudonymMap: Array.from(pseudonymDetails.values()),
    durationMs: Math.max(0, Number((endTime - startTime).toFixed(2))),
  };
}
