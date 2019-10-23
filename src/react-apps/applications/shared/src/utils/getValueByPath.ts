// Example
// getValueByPath(obj, 'some.path.to.value', null)

export const getValueByPath = (value: string, path: string, defaultValue: any) => {
  return String(path).split('.').reduce((accVal, currVal : any, currIndex) => {
    try {
      accVal = accVal[currVal] || defaultValue;
    } catch (e) {
      return defaultValue;
    }
    return accVal;
  }, value);
};
