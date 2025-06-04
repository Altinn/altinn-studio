export const isBelowSupportedVersion = (currentVersion: string, supportedVersion: string) =>
  currentVersion ? currentVersion.slice(0, supportedVersion.length) < supportedVersion : true;
