import { createStore, Store } from 'redux';
import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import setupMiddlewares from 'app-shared/utils/middleware/setupMiddlewares';
import reducers from '../reducers';

export const sagaMiddleware: SagaMiddleware<any> = createSagaMiddleware();
export const store: Store<IDashboardAppState> = configureStore();

function configureStore(initialState?: any): Store<IDashboardAppState> {
  const enhancer = setupMiddlewares([sagaMiddleware]);

  return createStore(
    reducers,
    initialState,
    enhancer,
  );
}
