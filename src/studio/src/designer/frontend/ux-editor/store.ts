import {
  applyMiddleware,
  compose,
  createStore,
  Middleware,
  Store,
} from 'redux';
import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import reducers from './reducers';

export const sagaMiddleware: SagaMiddleware<any> = createSagaMiddleware();
export const store: Store<IAppState> = configureStore();

function configureStore(initialState?: any): Store<IAppState> {
  const middlewares: Middleware[] = [sagaMiddleware];

  const enhancer = compose(applyMiddleware(...middlewares));

  const createdStore: Store<IAppState> = createStore(
    reducers,
    initialState,
    enhancer,
  );

  return createdStore;
}
