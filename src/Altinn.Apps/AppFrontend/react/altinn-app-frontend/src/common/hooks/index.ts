import { useRef, useEffect } from 'react';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/index';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useHasChangedIgnoreUndefined = (val: any) => {
  const stringifiedVal = JSON.stringify(val);
  const prevVal = usePrevious(stringifiedVal);
  if (!val || !prevVal) {
    return false;
  }
  return prevVal !== stringifiedVal;
}

export const usePrevious = (value: any) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}