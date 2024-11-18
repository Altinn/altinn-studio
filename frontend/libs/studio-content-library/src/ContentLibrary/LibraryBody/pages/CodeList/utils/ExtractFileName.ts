export const RemoveExtension = (filename: string): string => {
  const indexOfLastDot = filename.lastIndexOf('.');
  return indexOfLastDot < 0 ? filename : filename.substring(0, indexOfLastDot);
};
