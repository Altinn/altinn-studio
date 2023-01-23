import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';

// Use throughout your app instead of plain `useDispatch`
export const useAppDispatch = () => useDispatch<AppDispatch>();
