import { createStore, Store } from 'redux';
import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import setupMiddlewares from 'app-shared/utils/middleware/setupMiddlewares';
import reducers from '../reducers';

export const sagaMiddleware: SagaMiddleware<any> = createSagaMiddleware();
export const store: Store<IServiceDevelopmentState> = configureStore();

function configureStore(): Store<IServiceDevelopmentState> {
  const enhancer = setupMiddlewares([sagaMiddleware]);

  return createStore(
    reducers,
    undefined,
    enhancer,
  );
}
