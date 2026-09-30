/**
 * Hides everything after the 6-digit birth date of a fødselsnummer.
 * E.g. "12345678901" -> "123456*****". Works whether the backend sends the full
 * number or just the birth date, and won't double-mask an already-masked value.
 * This is an extra safety net for display, backend should also avoid sending the full number.
 */
export function maskSsn(ssn: string | null | undefined): string {
  if (!ssn) {
    return '';
  }
  return `${ssn.slice(0, 6)}*****`;
}
