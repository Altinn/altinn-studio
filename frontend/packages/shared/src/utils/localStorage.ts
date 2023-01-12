export const getLocalStorageObject = (storage_group: string) =>
  JSON.parse(localStorage.getItem(storage_group)) ?? {};

export const getLocalStorage = (storage_group: string, itemId: string) =>
  getLocalStorageObject(storage_group)[itemId];

export const setLocalStorage = (storage_group: string, itemId: string, value: any) => {
  const item = getLocalStorageObject(storage_group);
  item[itemId] = value;
  localStorage.setItem(storage_group, JSON.stringify(item));
  return value;
};
