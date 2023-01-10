export const stringToArray = (value: string): string[] => {
  return value?.replace(/ /g, '').split(',');
};

export const arrayToString = (value: string[]): string => {
  return value?.toString();
};
