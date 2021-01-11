import {
  applyMiddleware,
  compose,
  createStore,
  Middleware,
  Store,
} from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
// eslint-disable-next-line import/no-cycle
import reducers from './reducers';

export const sagaMiddleware: SagaMiddleware<any> = createSagaMiddleware();
export const store: Store<IAppState> = configureStore();

function configureStore(initialState?: any): Store<IAppState> {
  const middlewares: Middleware[] = [sagaMiddleware];

  let enhancer: any;

  if (process.env.NODE_ENV === 'development') {
    enhancer = composeWithDevTools(applyMiddleware(...middlewares));
  } else {
    enhancer = compose(applyMiddleware(...middlewares));
  }

  const createdStore: Store<IAppState> = createStore(
    reducers,
    initialState,
    enhancer,
  );

  return createdStore;
}
