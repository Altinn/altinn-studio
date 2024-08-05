import { cleanupStaleLocalStorageKeys } from './localStorageUtils';
import { typedLocalStorage } from '@studio/components/src/hooks/webStorage';

describe('cleanupStaleLocalStorageKeys', () => {
  it('Removes the selectedFormLayoutSetName key from local storage', () => {
    const unsupportedKey = 'selectedFormLayoutSetName';
    const value = 'value';
    typedLocalStorage.setItem(unsupportedKey, value);

    cleanupStaleLocalStorageKeys();

    expect(typedLocalStorage.getItem(unsupportedKey)).toBeUndefined();
  });

  it('Does not remove other keys from local storage', () => {
    const supportedKey = 'supportedKey';
    const value = 'value';
    typedLocalStorage.setItem(supportedKey, value);

    cleanupStaleLocalStorageKeys();

    expect(typedLocalStorage.getItem(supportedKey)).toBe(value);
  });
});
