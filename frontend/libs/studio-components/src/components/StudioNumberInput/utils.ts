export const isStringValidDecimalNumber = (value: string): boolean => {
  const numberRegex = /^[0-9]+([.,][0-9]*)?$/;
  return numberRegex.test(value);
};

export const convertStringToNumber = (value: string): number => Number(value.replace(',', '.'));

export const convertNumberToString = (value?: number): string =>
  value?.toString().replace('.', ',') || '';
