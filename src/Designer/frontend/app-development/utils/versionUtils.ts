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
