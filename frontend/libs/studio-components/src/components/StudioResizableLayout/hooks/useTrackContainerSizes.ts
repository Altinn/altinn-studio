// import { useLocalStorage } from "app-shared/hooks/useLocalStorage";
import { useState } from 'react';

export const useTrackContainerSizes = (layoutId: string) => {
  const [containerSizes, setContainerSizes] = useState<number[]>([]);

  // const [value, setValue, removeValue] = useLocalStorage(`studio:resizable-layout:${layoutId}:${localStorageContextKey}`, containerSizes);
  // useEffect(() => {
  //   setContainerSizes(value);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);
  //
  // useEffect(() => {
  //   setValue(containerSizes);
  // }, [containerSizes, setValue]);
  //
  return { containerSizes, setContainerSizes };
};
