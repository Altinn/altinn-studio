export const stringToArray = (value: string): string[] => {
  return value?.split(',').map((string) => string.trim());
};

export const arrayToString = (value: string[]): string => {
  return value?.toString();
};
