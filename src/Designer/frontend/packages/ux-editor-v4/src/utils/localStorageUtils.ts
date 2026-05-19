import { typedLocalStorage } from '@studio/pure-functions';

export const cleanupStaleLocalStorageKeys = (): void => {
  // Storage keys that are not supported anymore and to be removed should be added in this array
  const unsupportedStorageKeys = ['selectedFormLayoutSetName'];

  unsupportedStorageKeys.forEach((key) => typedLocalStorage.removeItem(key));
};
