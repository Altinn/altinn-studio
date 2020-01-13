import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../utils/networking';
import FormConfigActions from '../../actions';
import { IFetchFormConfig } from '../../actions/fetch';
import * as FormConfigActionTypes from '../../actions/types';

function* fetchFormConfigSaga({ url }: IFetchFormConfig): SagaIterator {
  try {
    const dataModel: any = yield call(get, url);
    const { Org, ServiceName, RepositoryName, ServiceId } = dataModel;

    yield call(FormConfigActions.fetchFormConfigFulfilled, Org, ServiceName, RepositoryName, ServiceId);
  } catch (err) {
    FormConfigActions.fetchFormConfigRejected(err);
  }
}

export function* watchFetchFormConfigSaga(): SagaIterator {
  yield takeLatest(FormConfigActionTypes.FETCH_FORM_CONFIG, fetchFormConfigSaga);
}
