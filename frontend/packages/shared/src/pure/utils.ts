export const deepCopy = <T>(value: T) => JSON.parse(JSON.stringify(value)) as T;
