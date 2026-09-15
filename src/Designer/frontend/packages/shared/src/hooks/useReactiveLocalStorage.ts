import { useCallback } from 'react';
import { typedLocalStorage } from '@studio/pure-functions';
import { useLocalStorage } from '@studio/hooks';
import { useEventListener } from './useEventListener';

export const useReactiveLocalStorage = <T>(
  key: string,
  initialValue?: T,
): [T | undefined, (newValue: T) => void, () => void] => {
  const [value, setValue, removeValue] = useLocalStorage(key, initialValue);

  const handleStorageChange = useCallback(() => {
    const item = typedLocalStorage.getItem<T>(key);
    setValue(item);
  }, [key, setValue]);

  useEventListener('storage', handleStorageChange);

  return [value, setValue, removeValue];
};
