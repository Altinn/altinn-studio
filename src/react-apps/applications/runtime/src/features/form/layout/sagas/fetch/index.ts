import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';

import Actions from '../../actions';
import * as ActionTypes from '../../actions/types';
import { IFetchFormLayout } from '../../actions/fetch';

// import { get } from 'Shared/utils/networking';
import { testData } from './testData';

function* fetchFormLayoutSaga({ }: IFetchFormLayout): SagaIterator {
  try {
    // const formLayout = yield call(get, url);
    const { components, containers, order } = testData.data;
    yield call(Actions.fetchFormLayoutFulfilled, components, containers, order);
  } catch (err) {
    yield call(Actions.fetchFormLayoutRejected, err);
  }
}

export function* watchFetchFormLayoutSaga(): SagaIterator {
  yield takeLatest(ActionTypes.FETCH_FORM_LAYOUT, fetchFormLayoutSaga);
}
