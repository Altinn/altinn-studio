// Example
// getValueByPath(obj, 'some.path.to.value', null)

export const getValueByPath = (value: string, path: string, defaultValue: any) => {
  return String(path).split('.').reduce((acc, v) => {
    try {
      acc = acc[v] || defaultValue;
    } catch (e) {
      return defaultValue;
    }
    return acc;
  }, value);
};
