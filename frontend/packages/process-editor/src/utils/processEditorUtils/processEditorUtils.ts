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
