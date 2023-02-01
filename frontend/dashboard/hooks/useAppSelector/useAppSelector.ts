import { useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState } from '../../app/store';

// Use throughout your app instead of plain `useSelector`
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
