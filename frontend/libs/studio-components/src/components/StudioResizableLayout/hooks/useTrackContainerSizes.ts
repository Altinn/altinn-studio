import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useEffect, useState } from 'react';

export const useTrackContainerSizes = (layoutId: string, localStorageContextKey: string) => {
  const [containerSizes, setContainerSizes] = useState<number[]>([]);

  const [value, setValue] = useLocalStorage(
    `studio:resizable-layout:${layoutId}:${localStorageContextKey}`,
    containerSizes,
  );
  useEffect(() => {
    setContainerSizes(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setValue(containerSizes);
  }, [containerSizes, setValue]);

  return { containerSizes, setContainerSizes };
};
