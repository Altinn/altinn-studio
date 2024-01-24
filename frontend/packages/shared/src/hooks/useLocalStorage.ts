import { useCallback, useState } from 'react';
import type { TypedStorage } from 'app-shared/utils/webStorage';
import { typedLocalStorage } from 'app-shared/utils/webStorage';

const useWebStorage = <T>(
  typedStorage: TypedStorage,
  key: string,
  initialValue?: T,
): [T, (newValue: T) => void, () => void] => {
  const [value, setValue] = useState<T>(typedStorage.getItem(key) || initialValue);

  const setStorageValue = useCallback(
    (newValue: T) => {
      typedStorage.setItem(key, newValue);
      setValue(newValue);
    },
    [key, typedStorage],
  );

  const removeStorageValue = useCallback(() => {
    typedStorage.removeItem(key);
    setValue(undefined);
  }, [key, typedStorage]);

  return [value, setStorageValue, removeStorageValue];
};

/**
 * @param key - the key to use in local storage
 * @param initialValue - the initial value to use if there is no value in local storage
 * @returns [value, setValue, removeValue] - the value, a function to set the value and a function to remove it
 * @description
 * useLocalStorage is a hook that allows you to use local storage the same way you would with useState
 */
export const useLocalStorage = <T>(key: string, initialValue?: T) =>
  useWebStorage<T>(typedLocalStorage, key, initialValue);
