import { SagaIterator } from 'redux-saga';
import { call, takeLatest, select } from 'redux-saga/effects';

import FormActions from '../../actions';
import { IFetchFormData } from '../../actions/fetch';
import * as FormDataActionTypes from '../../actions/types';
import { convertModelToDataBinding } from '../../../../../utils/databindings';

import { testData } from './testData';

// import { get } from 'Shared/utils/networking';

const SelectFormDataModel: (store: any) => any = (store: any) => store.formDataModel.dataModel;

function* fetchFormDataSaga({ url }: IFetchFormData): SagaIterator {
  try {
    // const fetchedLayout = yield call(get, url);
    const dataModel = yield select(SelectFormDataModel);
    const parsedLayout = convertModelToDataBinding(testData, dataModel);
    yield call(FormActions.fetchFormDataFulfilled, parsedLayout);
  } catch (err) {
    yield call(FormActions.fetchFormDataRejected, err);
  }
}

export function* watchFormDataSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.FETCH_FORM_DATA, fetchFormDataSaga);
}
