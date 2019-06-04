import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../utils/networking';
import FormResourceActions from '../../actions';
import {
  IFetchFormResource,
} from '../../actions/fetch';
import { FETCH_FORM_RESOURCES } from '../../actions/types';

function* fetchFormResource({ url }: IFetchFormResource): SagaIterator {
  try {
    const resource = yield call(get, url);
    yield call(FormResourceActions.fetchFormResourceFulfilled, resource);
  } catch (err) {
    yield call(FormResourceActions.fetchFormResourceRejected, err);
  }
}

export function* watchFetchFormResourceSaga(): SagaIterator {
  yield takeLatest(FETCH_FORM_RESOURCES, fetchFormResource);
}
