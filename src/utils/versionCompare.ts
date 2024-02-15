interface VersionCompareProps {
  actualVersion: string;
  minimumVersion: string;
  allowZeroInLast?: boolean;
}

/**
 * Checks if the given version is at least the given minimum version. Expects the version numbers to be
 * dot-separated numbers, e.g. "1.0.15". String parts, such as 'preview', 'alpha', 'rc' are not supported.
 *
 * The allowZeroInLast parameter is used to allow the last part of the version to be zero. This is useful
 * when running the backend with project references, as the build number is set to zero in that case.
 */
export function isAtLeastVersion({ actualVersion, minimumVersion, allowZeroInLast }: VersionCompareProps): boolean {
  const parts = actualVersion.split('.');
  const expectedParts = minimumVersion.split('.');
  if (parts.length !== expectedParts.length) {
    return false;
  }
  for (const i in expectedParts) {
    const expected = parseInt(expectedParts[i], 10);
    const actual = parseInt(parts[i], 10);
    const isLast = parseInt(i) === expectedParts.length - 1;
    if (isLast && allowZeroInLast && actual === 0) {
      return true;
    }
    if (actual > expected) {
      return true;
    }
    if (actual < expected) {
      return false;
    }
  }
  return true;
}
