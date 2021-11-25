import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '../reducers/rootReducer';
import { sagaMiddleware } from '../sagas/rootSaga';

const middlewares = [sagaMiddleware];

export const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware: () => any[]) =>
    getDefaultMiddleware().concat(middlewares),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
