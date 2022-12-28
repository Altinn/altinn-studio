export const isNumeric = (str: string) => parseInt(str).toString() === str;
export const deepCopy = (value: any) => JSON.parse(JSON.stringify(value));
export const updateKey = (obj: any, key: string, val: string) => ({ ...deepCopy(obj), [key]: val });

export const removeKey = (obj: any, key: string) => {
  const copy = deepCopy(obj);
  delete copy[key];
  return copy;
};
