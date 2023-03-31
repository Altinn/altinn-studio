import { useEffect, useRef } from 'react';

const usePrevious = (value: any) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export const useHasChangedIgnoreUndefined = (val: any) => {
  const stringifiedVal = JSON.stringify(val);
  const prevVal = usePrevious(stringifiedVal);
  if (!val || !prevVal) {
    return false;
  }
  return prevVal !== stringifiedVal;
};
