// Formats file sizes and remaining time in the user's language

const SIZE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const;

const DURATION_UNITS = [
  { unit: 'day', seconds: 24 * 60 * 60 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
] as const;

// Rounded to the largest unit that fits; null under a minute, which isn't worth a number
export function formatRemainingTime(seconds: number, language: string): string | null {
  if (!Number.isFinite(seconds) || seconds < 60) {
    return null;
  }
  const roughUnit = DURATION_UNITS.find((candidate) => seconds >= candidate.seconds) ?? DURATION_UNITS[2];
  const rounded = Math.round(seconds / roughUnit.seconds) * roughUnit.seconds;
  const unit = DURATION_UNITS.find((candidate) => rounded % candidate.seconds === 0) ?? DURATION_UNITS[2];
  return new Intl.NumberFormat(language, { style: 'unit', unit: unit.unit, unitDisplay: 'long' }).format(
    rounded / unit.seconds,
  );
}

// Decimal units, the way Broker states its size limits
export function formatFileSize(bytes: number, language: string): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < SIZE_UNITS.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return new Intl.NumberFormat(language, {
    style: 'unit',
    unit: SIZE_UNITS[unit],
    unitDisplay: 'short',
    maximumSignificantDigits: 3,
  }).format(value);
}
