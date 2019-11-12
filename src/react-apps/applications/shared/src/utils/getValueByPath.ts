// Example
// getValueByPath(obj, 'some.path.to.value', null)
// does not work with arrays

export const getValueByPath = (value: string, path: string, defaultValue: any) => {
  return String(path).split('.').reduce((accVal, currVal: any) => {
    try {
      accVal = accVal[currVal] || defaultValue;
    } catch (e) {
      return defaultValue;
    }
    return accVal;
  }, value);
};
