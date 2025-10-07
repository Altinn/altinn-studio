import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useEffect, useState } from 'react';

export const useTrackContainerSizes = (localStorageContextKey: string) => {
  const [containerSizes, setContainerSizes] = useState<number[]>([]);

  const [value, setValue] = useLocalStorage(
    `studio:resizable-layout:${localStorageContextKey}`,
    containerSizes,
  );

  useEffect(() => {
    setContainerSizes(value);
  }, [value]);

  useEffect(() => {
    setValue(containerSizes);
  }, [containerSizes, setValue]);

  return { containerSizes, setContainerSizes };
};
