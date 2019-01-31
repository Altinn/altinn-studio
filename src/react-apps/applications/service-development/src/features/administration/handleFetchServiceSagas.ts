import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../shared/src/utils/networking';
import * as HandleFetchServiceActions from './handleFetchServiceActions';
import * as HandleFetchServiceActionTypes from './handleFetchServiceActionTypes';
import HandleFetchServiceDispatcher from './handleFetchServiceDispatcher';

export function* handleFetchServiceSaga({
  url,
}: HandleFetchServiceActions.IFetchServiceAction): SagaIterator {
  try {
    const result = yield call(get, url);

    yield call(HandleFetchServiceDispatcher.fetchServiceFulfilled, result);
  } catch (err) {
    yield call(HandleFetchServiceDispatcher.fetchServiceRejected, err);
  }
}

export function* watchHandleFetchServiceSaga(): SagaIterator {
  yield takeLatest(
    HandleFetchServiceActionTypes.FETCH_SERVICE,
    handleFetchServiceSaga,
  );
}

// tslint:disable-next-line:space-before-function-paren
export default function* (): SagaIterator {
  yield fork(watchHandleFetchServiceSaga);
}
