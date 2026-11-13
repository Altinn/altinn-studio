import { useEffect, useRef, useCallback } from 'react';

type UseDebounceOptions = {
  debounceTimeInMs: number;
};

type DebounceOptions = {
  debounceTimeInMs?: number;
};

export const useDebounce = ({
  debounceTimeInMs,
}: UseDebounceOptions): { debounce: (callback: Function, options?: DebounceOptions) => void } => {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const debounce = useCallback(
    (
      callback: Function,
      { debounceTimeInMs: localDebounceTimeInMs }: DebounceOptions = {},
    ): void => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        callback();
      }, localDebounceTimeInMs ?? debounceTimeInMs);
    },
    [debounceTimeInMs],
  );

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return { debounce };
};
