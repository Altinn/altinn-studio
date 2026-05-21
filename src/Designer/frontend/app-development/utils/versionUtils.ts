export const isVersionAtLeast = (
  version: string | undefined,
  major: number,
  minor: number,
  patch: number,
): boolean => {
  const [actualMajor = 0, actualMinor = 0, actualPatch = 0] = (version ?? '')
    .split(/[.-]/)
    .map((part) => Number(part));

  if ([actualMajor, actualMinor, actualPatch].some(Number.isNaN)) {
    return false;
  }

  if (actualMajor !== major) return actualMajor > major;
  if (actualMinor !== minor) return actualMinor > minor;
  return actualPatch >= patch;
};

export const isMaskinportenScopesSupportedVersion = (version: string | undefined): boolean =>
  isVersionAtLeast(version, 8, 3, 0);

export const isMaskinportenDefaultScopesOptInVersion = (version: string | undefined): boolean =>
  isMaskinportenScopesSupportedVersion(version) && !isVersionAtLeast(version, 9, 0, 0);
