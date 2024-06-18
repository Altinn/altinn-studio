import { useRef } from 'react';

type UseDebounceOptions = {
  debounceTimeInMs: number;
};
export const useDebounce = ({ debounceTimeInMs }: UseDebounceOptions) => {
  const debounceRef = useRef(undefined);
  const debounce = (callback: Function) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      callback();
    }, debounceTimeInMs);
  };
  return { debounce };
};
