import type { Middleware, Store } from 'redux';
import { applyMiddleware, compose, createStore } from 'redux';
import type { SagaMiddleware } from 'redux-saga';
import createSagaMiddleware from 'redux-saga';
import reducers from './reducers';
import type { IAppState } from './types/global';

export const sagaMiddleware: SagaMiddleware<any> = createSagaMiddleware();
export const store: Store<IAppState> = configureStore({
  reducer: reducers,
  middleware(getDefaultMiddleware) {
    return getDefaultMiddleware().concat([sagaMiddleware]);
  },
});

function configureStore(initialState?: any): Store<IAppState> {
  const middlewares: Middleware[] = [sagaMiddleware];

  const enhancer = compose(applyMiddleware(...middlewares));

  const createdStore: Store<IAppState> = createStore(reducers, initialState, enhancer);

  return createdStore;
}
