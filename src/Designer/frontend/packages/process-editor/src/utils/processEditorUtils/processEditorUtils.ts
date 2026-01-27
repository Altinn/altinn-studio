/**
 * Minimum version of Altinn.App .NET libraries required for PDF service task
 */
export const MINIMUM_APPLIB_VERSION_FOR_PDF_SERVICE_TASK = '8.9.0';

/**
 * Minimum version of app-frontend-react required for PDF service task
 */
export const MINIMUM_FRONTEND_VERSION_FOR_PDF_SERVICE_TASK = '4.25.2';

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
 * Compares two semantic version strings and returns true if version >= minVersion.
 *
 * When version segments are missing:
 * - Missing segments in `version` are treated as "latest" (always passes)
 * - Missing segments in `minVersion` are treated as "unspecified" (always passes)
 *
 * Examples:
 * - '8.9' vs '8.9.0' returns true (version's missing patch is treated as latest)
 * - '8.9.0' vs '8.9' returns true (minVersion's missing patch is unspecified)
 *
 * @param version the version to check (e.g., "8.9.0" or "8.10.1-preview.1")
 * @param minVersion the minimum required version (e.g., "8.9.0")
 *
 * @returns boolean - true if version >= minVersion, false otherwise
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
    const v = versionParts[i];
    const m = minVersionParts[i];

    if (v === undefined || m === undefined || v > m) {
      return true;
    }
    if (v < m) {
      return false;
    }
  }

  return true; // versions are equal
};
