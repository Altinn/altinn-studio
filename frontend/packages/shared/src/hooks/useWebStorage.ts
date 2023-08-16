import { useCallback, useState } from 'react';
import { TypedStorage, typedLocalStorage } from 'app-shared/utils/webStorage';

const useWebStorage = <T>(
  typedStorage: TypedStorage,
  key: string,
  initialValue?: T
): [T, (newValue: T) => void] => {
  const [value, setValue] = useState<T>(typedStorage.getItem(key) || initialValue);

  const setStorageValue = useCallback(
    (newValue: T) => {
      typedStorage.setItem(key, newValue);
      setValue(newValue);
    },
    [key, typedStorage]
  );
  return [value, setStorageValue];
};

export const useLocalStorage = <T>(key: string, initialValue?: T) =>
  useWebStorage<T>(typedLocalStorage, key, initialValue);
