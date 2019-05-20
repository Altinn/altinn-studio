import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';

import FormConfigActions from '../../actions';
import {
  IFetchFormConfig,
} from '../../actions/fetch';
import * as FormConfigActionTypes from '../../actions/types';

import { testData } from '../../../datamodell/sagas/fetch/testData';

// import { get } from 'Shared/utils/networking';

function* fetchFormConfigSaga({ url }: IFetchFormConfig): SagaIterator {
  try {
    // const formConfig = yield call(get, url);
    const dataModel = testData;
    const { Org, ServiceName, RepositoryName, ServiceId } = dataModel;

    yield call(FormConfigActions.fetchFormConfigFulfilled, Org, ServiceName, RepositoryName, ServiceId);
  } catch (err) {
    FormConfigActions.fetchFormConfigRejected(err);
  }
}

export function* watchFetchFormConfigSaga(): SagaIterator {
  yield takeLatest(FormConfigActionTypes.FETCH_FORM_CONFIG, fetchFormConfigSaga);
}
