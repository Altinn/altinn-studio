import { useCallback } from 'react';
import { typedLocalStorage } from 'app-shared/utils/webStorage';
import { useLocalStorage } from './useLocalStorage';
import { useEventListener } from './useEventListener';

export const useReactiveLocalStorage = <T>(
  key: string,
  initialValue?: T,
): [T, (newValue: T) => void, () => void] => {
  const [value, setValue, removeValue] = useLocalStorage(key, initialValue);

  const handleStorageChange = useCallback(() => {
    const item = typedLocalStorage.getItem<T>(key);
    setValue(item);
  }, [key, setValue]);

  useEventListener('storage', handleStorageChange);

  return [value, setValue, removeValue];
};
