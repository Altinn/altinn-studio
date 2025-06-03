export const isBelowSupportedVersion = (currentVersion: string, supportedVersion: string) =>
  currentVersion?.slice(0, supportedVersion.length) < supportedVersion;
