import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import FormResourceActions from '../../actions';
import {
  IFetchFormResource,
} from '../../actions/fetch';
import { FETCH_FORM_RESOURCES } from '../../actions/types';

// import {get} from 'Shared/utils/networking';
import { testData } from './testData';

function* fetchFormResource({ url }: IFetchFormResource): SagaIterator {
  try {
    // const resource = yield call(get, url);
    const resource = testData.data;
    console.log(resource);
    yield call(FormResourceActions.fetchFormResourceFulfilled, resource);
  } catch (err) {
    yield call(FormResourceActions.fetchFormResourceRejected, err);
  }
}

export function* watchFetchFormResourceSaga(): SagaIterator {
  yield takeLatest(FETCH_FORM_RESOURCES, fetchFormResource);
}
