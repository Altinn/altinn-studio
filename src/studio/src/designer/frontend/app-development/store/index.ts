import {
  applyMiddleware,
  compose,
  createStore,
  Middleware,
  Store
} from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import getRepoTypeFromLocation from '../../shared/utils/getRepoTypeFromLocation';
import createReducers from '../reducers';

export const sagaMiddleware: SagaMiddleware<any> = createSagaMiddleware();
export const store: Store<IServiceDevelopmentState> = configureStore();

function configureStore(): Store<IServiceDevelopmentState> {
  const middlewares: Middleware[] = [sagaMiddleware];

  let enhancer: any;
  const repoType = getRepoTypeFromLocation();

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line global-require
    const { logger } = require('redux-logger');
    middlewares.push(logger);
    enhancer = composeWithDevTools(applyMiddleware(...middlewares));
  } else {
    enhancer = compose(applyMiddleware(...middlewares));
  }

  return createStore(
    createReducers(repoType),
    undefined,
    enhancer,
  );
}
