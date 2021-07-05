import { applyMiddleware,
  compose,
  createStore,
  Middleware,
  Store } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import reducers from '../reducers';

export const sagaMiddleware: SagaMiddleware<any> = createSagaMiddleware();
export const store: Store<IDashboardAppState> = configureStore();

function configureStore(initialState?: any): Store<IDashboardAppState> {
  const middlewares: Middleware[] = [sagaMiddleware];

  let enhancer: any;

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line global-require
    const { logger } = require('redux-logger');
    middlewares.push(logger);
    enhancer = composeWithDevTools(applyMiddleware(...middlewares));
  } else {
    enhancer = compose(applyMiddleware(...middlewares));
  }

  return createStore(
    reducers,
    initialState,
    enhancer,
  );
}
