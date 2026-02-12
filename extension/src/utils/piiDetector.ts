/**
 * PII (Personally Identifiable Information) Detection Utility
 * Detects common PII patterns in user input and provides warnings
 */

export interface PIIMatch {
  type: PIIType;
  value: string;
  redacted: string;
  startIndex: number;
  endIndex: number;
}

export type PIIType =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit_card'
  | 'ip_address'
  | 'date_of_birth';

interface PIIPattern {
  type: PIIType;
  pattern: RegExp;
  label: string;
  redactWith: string;
}

// PII detection patterns
const PII_PATTERNS: PIIPattern[] = [
  {
    type: 'email',
    // Matches most email formats
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    label: 'Email address',
    redactWith: '[EMAIL]',
  },
  {
    type: 'phone',
    // Matches various phone formats: (123) 456-7890, 123-456-7890, 123.456.7890, +1 123 456 7890
    pattern: /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
    label: 'Phone number',
    redactWith: '[PHONE]',
  },
  {
    type: 'ssn',
    // Matches SSN format: 123-45-6789 or 123 45 6789
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    label: 'Social Security Number',
    redactWith: '[SSN]',
  },
  {
    type: 'credit_card',
    // Matches credit card numbers (13-19 digits with optional separators)
    pattern: /\b(?:\d{4}[-\s]?){3,4}\d{1,4}\b/g,
    label: 'Credit card number',
    redactWith: '[CARD]',
  },
  {
    type: 'ip_address',
    // Matches IPv4 addresses
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    label: 'IP address',
    redactWith: '[IP]',
  },
  {
    type: 'date_of_birth',
    // Matches date patterns that might be DOB: MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD
    // Only flag if preceded by birth-related keywords
    pattern: /\b(?:born|birthday|dob|date of birth|birthdate)[\s:]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/gi,
    label: 'Date of birth',
    redactWith: '[DOB]',
  },
];

// Additional validation to reduce false positives
function isLikelyPII(type: PIIType, value: string): boolean {
  switch (type) {
    case 'phone':
      // Must have at least 10 digits
      const digits = value.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;

    case 'ssn':
      // SSN should be exactly 9 digits
      const ssnDigits = value.replace(/\D/g, '');
      // Exclude obviously invalid SSNs (000, 666, 900-999 in first group)
      if (ssnDigits.length !== 9) return false;
      const firstThree = parseInt(ssnDigits.substring(0, 3));
      return firstThree !== 0 && firstThree !== 666 && firstThree < 900;

    case 'credit_card':
      // Must have 13-19 digits and pass basic Luhn check
      const cardDigits = value.replace(/\D/g, '');
      return cardDigits.length >= 13 && cardDigits.length <= 19 && luhnCheck(cardDigits);

    case 'email':
      // Basic email validation already in regex
      return true;

    case 'ip_address':
      // IP validation already in regex
      return true;

    case 'date_of_birth':
      return true;

    default:
      return true;
  }
}

// Luhn algorithm for credit card validation
function luhnCheck(num: string): boolean {
  let sum = 0;
  let isEven = false;

  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Detect PII in the given text
 * @param text - The text to scan for PII
 * @returns Array of PII matches found
 */
export function detectPII(text: string): PIIMatch[] {
  const matches: PIIMatch[] = [];

  for (const { type, pattern, redactWith } of PII_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[0];

      if (isLikelyPII(type, value)) {
        matches.push({
          type,
          value,
          redacted: redactWith,
          startIndex: match.index,
          endIndex: match.index + value.length,
        });
      }
    }
  }

  // Sort by start index and remove overlapping matches (keep first)
  matches.sort((a, b) => a.startIndex - b.startIndex);

  const filtered: PIIMatch[] = [];
  let lastEnd = -1;

  for (const match of matches) {
    if (match.startIndex >= lastEnd) {
      filtered.push(match);
      lastEnd = match.endIndex;
    }
  }

  return filtered;
}

/**
 * Check if text contains any PII
 * @param text - The text to check
 * @returns true if PII is detected
 */
export function containsPII(text: string): boolean {
  return detectPII(text).length > 0;
}

/**
 * Redact PII from text
 * @param text - The text to redact
 * @returns Text with PII replaced by redaction markers
 */
export function redactPII(text: string): string {
  const matches = detectPII(text);

  if (matches.length === 0) {
    return text;
  }

  let result = '';
  let lastIndex = 0;

  for (const match of matches) {
    result += text.slice(lastIndex, match.startIndex);
    result += match.redacted;
    lastIndex = match.endIndex;
  }

  result += text.slice(lastIndex);

  return result;
}

/**
 * Get human-readable labels for detected PII types
 * @param matches - Array of PII matches
 * @returns Array of unique PII type labels
 */
export function getPIILabels(matches: PIIMatch[]): string[] {
  const typeToLabel: Record<PIIType, string> = {
    email: 'email address',
    phone: 'phone number',
    ssn: 'Social Security Number',
    credit_card: 'credit card number',
    ip_address: 'IP address',
    date_of_birth: 'date of birth',
  };

  const uniqueTypes = [...new Set(matches.map((m) => m.type))];
  return uniqueTypes.map((type) => typeToLabel[type]);
}
