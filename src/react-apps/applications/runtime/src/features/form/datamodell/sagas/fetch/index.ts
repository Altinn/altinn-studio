import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';

import DataModelActions from '../../actions';
import * as ActionTypes from '../../actions/types';
import { IFetchDataModel } from '../../actions/fetch';

import { get } from 'Shared/utils/networking';

function * fetchFormDataModelSaga({ url }: IFetchDataModel): SagaIterator {
  try {
    const dataModel = yield call(get, url);
    yield call(DataModelActions.fetchDataModelFulfilled, dataModel);
  } catch (err) {
    yield call(DataModelActions.fetchDataModelRejected, err);
  }
}

export function * watchFetchFormDataModelSaga(): SagaIterator {
  yield takeLatest(ActionTypes.FETCH_DATA_MODEL, fetchFormDataModelSaga);
}