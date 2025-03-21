import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useEffect, useMemo, useState } from 'react';

export const useTrackContainerSizes = (localStorageContextKey: string) => {
  const [containerSizes, setContainerSizes] = useState<number[]>([]);

  const [value, setValue] = useLocalStorage(
    `studio:resizable-layout:${localStorageContextKey}`,
    containerSizes,
  );

  useMemo(() => {
    setContainerSizes(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setValue(containerSizes);
  }, [containerSizes, setValue]);

  return { containerSizes, setContainerSizes };
};
