import { useEffect, useRef, useCallback } from 'react';

type UseDebounceOptions = {
  debounceTimeInMs: number;
};
export const useDebounce = ({
  debounceTimeInMs,
}: UseDebounceOptions): { debounce: (callback: Function) => void } => {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const debounce = useCallback(
    (callback: Function): void => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        callback();
      }, debounceTimeInMs);
    },
    [debounceTimeInMs],
  );

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return { debounce };
};
