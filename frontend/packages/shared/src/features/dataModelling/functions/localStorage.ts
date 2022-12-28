export const LOCAL_STORAGE_KEY = 'datamodelLocalStorage';

export const getLocalStorageObject = () =>
  JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) ?? {};

export const getLocalStorageItem = (key: string) => getLocalStorageObject()[key];

export const setLocalStorageItem = (key: string, value: any) => {
  const item = getLocalStorageObject();
  item[key] = value;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(item));
  return value;
};
