import { cleanupStaleLocalStorageKeys } from './localStorageUtils';
import { typedLocalStorage } from '@studio/pure-functions';

describe('cleanupStaleLocalStorageKeys', () => {
  it('Removes the selectedFormLayoutSetName key from local storage', () => {
    const unsupportedKey = 'selectedFormLayoutSetName';
    const value = 'value';
    typedLocalStorage.setItem(unsupportedKey, value);

    cleanupStaleLocalStorageKeys();

    expect(typedLocalStorage.getItem(unsupportedKey)).toBeNull();
  });

  it('Does not remove other keys from local storage', () => {
    const supportedKey = 'supportedKey';
    const value = 'value';
    typedLocalStorage.setItem(supportedKey, value);

    cleanupStaleLocalStorageKeys();

    expect(typedLocalStorage.getItem(supportedKey)).toBe(value);
  });
});
