export const isBelowSupportedVersion = (currentVersion: string, supportedVersion: number) => {
  if (!currentVersion) return true;

  var majorVersion = parseInt(currentVersion.split('.')[0]);
  return majorVersion < supportedVersion;
};
