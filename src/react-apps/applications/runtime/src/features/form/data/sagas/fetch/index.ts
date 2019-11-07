import { SagaIterator } from 'redux-saga';
import {
  call,
  select,
  takeLatest,
} from 'redux-saga/effects';
import { get } from '../../../../../../../shared/src/utils/networking';
import { convertModelToDataBinding } from '../../../../../utils/databindings';
import FormActions from '../../actions';
import { IFetchFormData } from '../../actions/fetch';
import * as FormDataActionTypes from '../../actions/types';

const SelectFormDataModel: (store: any) => any = (store: any) => store.formDataModel.dataModel;

function* fetchFormDataSaga({ url }: IFetchFormData): SagaIterator {
  try {
    const fetchedLayout = yield call(get, url);
    const dataModel = yield select(SelectFormDataModel);
    const parsedLayout = convertModelToDataBinding(fetchedLayout, dataModel);
    yield call(FormActions.fetchFormDataFulfilled, parsedLayout);
  } catch (err) {
    yield call(FormActions.fetchFormDataRejected, err);
  }
}

export function* watchFormDataSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.FETCH_FORM_DATA, fetchFormDataSaga);
}
