/**
 * Remove extension from filename.
 * @param filename
 * @returns filename without extension
 */
export const removeExtension = (filename: string): string => {
  const indexOfLastDot = filename.lastIndexOf('.');
  return indexOfLastDot < 0 ? filename : filename.substring(0, indexOfLastDot);
};
