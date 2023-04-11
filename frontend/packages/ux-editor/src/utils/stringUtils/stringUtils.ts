export const stringToArray = (value: string, separator: string = ','): string[] => {
  return value?.split(separator).map((string) => string.trim());
};

export const arrayToString = (value: string[]): string => {
  return value?.toString();
};
