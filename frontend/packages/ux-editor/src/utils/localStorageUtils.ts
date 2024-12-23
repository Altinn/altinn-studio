import { typedLocalStorage } from 'app-shared/webStorage';

export const cleanupStaleLocalStorageKeys = (): void => {
  // Storage keys that are not supported anymore and to be removed should be added in this array
  const unsupportedStorageKeys = ['selectedFormLayoutSetName'];

  unsupportedStorageKeys.forEach((key) => typedLocalStorage.removeItem(key));
};
