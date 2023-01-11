import { getLocalStorageObject, getLocalStorage } from 'app-shared/utils/localStorage';

export const LOCAL_STORAGE_KEY = 'datamodelLocalStorage';

const getLocalStorageObj = () => getLocalStorageObject(LOCAL_STORAGE_KEY);

export const getLocalStorageItem = (key: string) => getLocalStorage(LOCAL_STORAGE_KEY, key);

export const setLocalStorageItem = (key: string, value: any) => {
  const item = getLocalStorageObj();
  item[key] = value;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(item));
  return value;
};
