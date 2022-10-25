import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/dist/query';
import { Store } from 'redux';
import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import { uiEditorApi } from './services/uiEditor';
import reducers from './reducers';
import type { IAppState } from './types/global';

export const sagaMiddleware: SagaMiddleware<any> = createSagaMiddleware();
export const store: Store<IAppState> = configureStore({
  reducer: reducers,
  middleware(getDefaultMiddleware) {
    return getDefaultMiddleware()
      .concat([sagaMiddleware])
      .concat(uiEditorApi.middleware)
  },
});

setupListeners(store.dispatch);
