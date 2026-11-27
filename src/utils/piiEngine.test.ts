import { describe, expect, it } from 'vitest';
import {
  isValidIPv4,
  isValidIPv6,
  isValidLuhn,
  sanitizeText,
  type PIICategory,
} from './piiEngine';
import { SAMPLE_NOISY_DATA } from './sampleData';

const ALL_ENABLED: Record<PIICategory, boolean> = {
  EMAIL: true,
  PHONE: true,
  IP: true,
  PAN: true,
  AADHAAR: true,
  CREDIT_CARD: true,
};

describe('piiEngine validation primitives', () => {
  it('validates Luhn checksums accurately', () => {
    expect(isValidLuhn('4532-0155-8291-0367')).toBe(true);
    expect(isValidLuhn('5425 2334 3010 9903')).toBe(true);
    expect(isValidLuhn('4532-0155-8291-0365')).toBe(false);
    expect(isValidLuhn('2345678901234561')).toBe(false);
    expect(isValidLuhn('0000000000000000')).toBe(false);
    expect(isValidLuhn('123456')).toBe(false);
  });

  it('validates IPv4 octets strictly 0-255 and rejects invalid IPs', () => {
    expect(isValidIPv4('192.168.14.88')).toBe(true);
    expect(isValidIPv4('0.0.0.0')).toBe(true);
    expect(isValidIPv4('255.255.255.255')).toBe(true);
    expect(isValidIPv4('999.999.999.999')).toBe(false);
    expect(isValidIPv4('256.1.1.1')).toBe(false);
    expect(isValidIPv4('010.0.0.1')).toBe(false);
  });

  it('validates IPv6 addresses and rejects timestamps', () => {
    expect(isValidIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    expect(isValidIPv6('fe80::1ff:fe23:4567:890a')).toBe(true);
    expect(isValidIPv6('::1')).toBe(true);
    expect(isValidIPv6('10:00:21')).toBe(false);
    expect(isValidIPv6('::')).toBe(false);
  });
});

describe('piiEngine detection, boundary checks, and overlap resolution', () => {
  it('never splits a 16-digit Luhn credit card into Aadhaar or Phone', () => {
    const text = 'Card: 4532-0155-8291-0367';
    const result = sanitizeText(text, { mode: 'partial', enabledCategories: ALL_ENABLED });
    expect(result.totalDetections).toBe(1);
    expect(result.detections[0].type).toBe('CREDIT_CARD');
    expect(result.detections[0].metadata?.luhnVerified).toBe(true);
    expect(result.sanitizedText).toBe('Card: XXXX-XXXX-XXXX-0367');
  });

  it('ignores 16-digit non-Luhn order IDs completely (no Card, Aadhaar, or Phone false positives)', () => {
    const text = 'Orders: 4532-0155-8291-0365 and 2345678901234561 and 4532015582910365';
    const result = sanitizeText(text, { mode: 'full', enabledCategories: ALL_ENABLED });
    expect(result.totalDetections).toBe(0);
    expect(result.sanitizedText).toBe(text);
  });

  it('classifies +919876543210 as PHONE, not AADHAAR, and does not consume trailing parentheses', () => {
    const text = 'Call +919876543210 immediately (Spouse: +91 98765 43210).';
    const result = sanitizeText(text, { mode: 'pseudonym', enabledCategories: ALL_ENABLED });
    expect(result.totalDetections).toBe(2);
    expect(result.detections[0].type).toBe('PHONE');
    expect(result.detections[1].type).toBe('PHONE');
    expect(result.detections[1].value).toBe('+91 98765 43210');
    expect(result.sanitizedText).toBe('Call PHONE_01 immediately (Spouse: PHONE_01).');
  });

  it('rejects version strings like v2.1.4.0 and invalid IPs like 999.999.999.999', () => {
    const text = 'Build v2.1.4.0 rejected header 999.999.999.999 from 10.24.18.92';
    const result = sanitizeText(text, { mode: 'partial', enabledCategories: ALL_ENABLED });
    expect(result.totalDetections).toBe(1);
    expect(result.detections[0].value).toBe('10.24.18.92');
    expect(result.sanitizedText).toBe(
      'Build v2.1.4.0 rejected header 999.999.999.999 from 10.24.xxx.xxx'
    );
  });

  it('applies Email > PAN priority when PAN-like string is inside uppercase email', () => {
    const text = 'Send invoice to ABCDE1234F@CORP.COM and PAN ABCDE1234F';
    const result = sanitizeText(text, { mode: 'full', enabledCategories: ALL_ENABLED, showCategoryTagsInFullMask: true });
    expect(result.countsByCategory.EMAIL).toBe(1);
    expect(result.countsByCategory.PAN).toBe(1);
    expect(result.sanitizedText).toBe(
      'Send invoice to [REDACTED_EMAIL] and PAN [REDACTED_PAN]'
    );
  });
});

describe('piiEngine redaction modes', () => {
  it('supports Full Mask with and without category tags', () => {
    const text = 'Email: john.doe@company.com, PAN: ABCDE1234F';
    const plain = sanitizeText(text, {
      mode: 'full',
      enabledCategories: ALL_ENABLED,
      showCategoryTagsInFullMask: false,
    });
    expect(plain.sanitizedText).toBe('Email: [REDACTED], PAN: [REDACTED]');

    const tagged = sanitizeText(text, {
      mode: 'full',
      enabledCategories: ALL_ENABLED,
      showCategoryTagsInFullMask: true,
    });
    expect(tagged.sanitizedText).toBe('Email: [REDACTED_EMAIL], PAN: [REDACTED_PAN]');
  });

  it('supports Partial Mask with context preservation across all 6 categories', () => {
    const text = [
      'E: john.doe@company.com',
      'P: +91 98765 43210',
      'I: 192.168.14.88',
      'N: ABCDE1234F',
      'A: 4829-7310-6452',
      'C: 4532-0155-8291-0367',
    ].join('\n');

    const result = sanitizeText(text, { mode: 'partial', enabledCategories: ALL_ENABLED });
    expect(result.sanitizedText).toBe(
      [
        'E: jo***@company.com',
        'P: +XX XXXXX X3210',
        'I: 192.168.xxx.xxx',
        'N: AB*******F',
        'A: XXXX-XXXX-6452',
        'C: XXXX-XXXX-XXXX-0367',
      ].join('\n')
    );
  });

  it('produces deterministic pseudonyms across case and whitespace variations', () => {
    const text =
      '1: priya.sharma@finvault.in | 2: PRIYA.SHARMA@FINVAULT.IN | 3: +91 98765 43210 | 4: +91-9876543210 | 5: dev@acme.io';

    const result = sanitizeText(text, { mode: 'pseudonym', enabledCategories: ALL_ENABLED });
    expect(result.sanitizedText).toBe(
      '1: EMAIL_01 | 2: EMAIL_01 | 3: PHONE_01 | 4: PHONE_01 | 5: EMAIL_02'
    );
    expect(result.pseudonymMap).toHaveLength(3);
    expect(result.pseudonymMap[0]).toMatchObject({
      token: 'EMAIL_01',
      occurrences: 2,
    });
    expect(result.pseudonymMap[1]).toMatchObject({
      token: 'PHONE_01',
      occurrences: 2,
    });
  });

  it('is stateless across consecutive runs (no stale regex lastIndex bugs)', () => {
    const text = 'abc@def.com 192.168.1.1 ABCDE1234F';
    const r1 = sanitizeText(text, { mode: 'pseudonym', enabledCategories: ALL_ENABLED });
    const r2 = sanitizeText(text, { mode: 'pseudonym', enabledCategories: ALL_ENABLED });
    expect(r1.sanitizedText).toBe(r2.sanitizedText);
    expect(r1.detections).toEqual(r2.detections);
  });
});

describe('SAMPLE_NOISY_DATA integration', () => {
  it('detects all expected entities and ignores all decoys cleanly', () => {
    const result = sanitizeText(SAMPLE_NOISY_DATA, {
      mode: 'pseudonym',
      enabledCategories: ALL_ENABLED,
    });

    expect(result.countsByCategory).toEqual({
      EMAIL: 5,
      PHONE: 5,
      IP: 5,
      PAN: 3,
      AADHAAR: 2,
      CREDIT_CARD: 3,
    });
    expect(result.totalDetections).toBe(23);

    // Ensure decoys remain untouched in sanitized output
    expect(result.sanitizedText).toContain('v2.1.4.0');
    expect(result.sanitizedText).toContain('999.999.999.999');
    expect(result.sanitizedText).toContain('4532-0155-8291-0365');
    expect(result.sanitizedText).toContain('2345678901234561');
    expect(result.sanitizedText).toContain('4532015582910365');
  });
});
