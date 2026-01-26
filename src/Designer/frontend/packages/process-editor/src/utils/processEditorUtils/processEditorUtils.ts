/**
 * Returns true if the version is 8 or higher, and false otherwise
 *
 * @param version the version to check
 *
 * @returns boolean
 */
export const supportsProcessEditor = (version: string): boolean => {
  const firstNumber: number = Number(version[0]);
  return firstNumber > 7;
};

/**
 * Compares two semantic version strings and returns true if version >= minVersion
 *
 * @param version the version to check (e.g., "8.9.0" or "8.10.1-preview.1")
 * @param minVersion the minimum required version (e.g., "8.9.0")
 *
 * @returns boolean
 */
export const isVersionEqualOrGreater = (version: string, minVersion: string): boolean => {
  if (!version || !minVersion) {
    return false;
  }

  const parseVersion = (v: string): number[] => {
    // Remove any suffix like "-preview.1" and split by "."
    const cleanVersion = v.split('-')[0];
    return cleanVersion.split('.').map((part) => parseInt(part, 10) || 0);
  };

  const versionParts = parseVersion(version);
  const minVersionParts = parseVersion(minVersion);

  for (let i = 0; i < Math.max(versionParts.length, minVersionParts.length); i++) {
    const v = versionParts[i] || 0;
    const m = minVersionParts[i] || 0;

    if (v > m) return true;
    if (v < m) return false;
  }

  return true; // versions are equal
};
