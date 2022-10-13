export const isNumeric = (str: string) => parseInt(str).toString() === str;
export const deepCopy = (value: any) => JSON.parse(JSON.stringify(value));
