import reducers from './reducers';
import type { IAppState } from './types/global';
import type { Store } from 'redux';
import { configureStore } from '@reduxjs/toolkit';

export const store: Store<IAppState> = configureStore({
  reducer: reducers,
  devTools: process.env.NODE_ENV !== 'production',
});
