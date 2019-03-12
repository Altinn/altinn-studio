import { SagaIterator, Task } from 'redux-saga';
import { sagaMiddleware } from '../store';

function* root(): SagaIterator {
}

export const initSagas: () => Task = () => sagaMiddleware.run(root);