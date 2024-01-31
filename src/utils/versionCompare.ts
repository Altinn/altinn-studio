/**
 * Checks if the given version is at least the given minimum version. Expects the version numbers to be
 * dot-separated numbers, e.g. "1.0.15". String parts, such as 'preview', 'alpha', 'rc' are not supported.
 */
export function isAtLeastVersion(version: string, minVersion: string): boolean {
  const parts = version.split('.');
  const expectedParts = minVersion.split('.');
  for (const i in expectedParts) {
    const expected = parseInt(expectedParts[i], 10);
    const actual = parseInt(parts[i], 10);
    if (actual > expected) {
      return true;
    }
    if (actual < expected) {
      return false;
    }
  }
  return true;
}
