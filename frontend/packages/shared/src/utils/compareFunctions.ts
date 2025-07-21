// Compare functions to use with Array.prototype.sort().
// They should return a positive number if A should be sorted after B, a negative number if B should be sorted after A or 0 if there is no preference.

export type CompareFunction<T> = (a: T, b: T) => number;

export const alphabeticalCompareFunction: CompareFunction<string> = (a, b) => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

export const isBelowSupportedVersion = (currentVersion: string, supportedVersion: number) => {
  if (!currentVersion || !supportedVersion) return true;

  const majorVersion = parseInt(currentVersion.split('.')[0]);
  return majorVersion < supportedVersion;
};
