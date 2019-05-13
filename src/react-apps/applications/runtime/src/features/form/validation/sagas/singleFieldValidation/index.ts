import { AxiosRequestConfig } from 'axios';
import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeStore } from '../../../../../types/global';
import { convertDataBindingToModel } from '../../../../../utils/databindings';
import { put } from '../../../../../utils/networking';
import * as Actions from '../../actions/singleFieldValidation';
import * as ActionTypes from '../../actions/types';

export function* runSingleFieldValidationSaga({
  url,
  dataModelBinding,
}: Actions.IRunSingleFieldValidationAction): SagaIterator {
  const state: IRuntimeStore = yield select();
  try {
    const requestBody = convertDataBindingToModel(state.formData.formData, state.formDataModel.dataModel);
    const config: AxiosRequestConfig = {
      headers: {
        ValidationTriggerField: dataModelBinding,
      },
    };
    const response = yield call(put, url, 'Validate', requestBody, config, dataModelBinding);
    if (response && response.validationResult) {
      // Update validationError state
      const validationErrors: any = response.validationResult.errors;
      yield call(Actions.runSingleFieldValidationActionFulfilled, validationErrors);
    }
  } catch (err) {
    yield call(Actions.runSingleFieldValidationActionRejected, err);
  }
}

export function* watchRunSingleFieldValidationSaga(): SagaIterator {
  yield takeLatest(ActionTypes.RUN_SINGLE_FIELD_VALIDATION, runSingleFieldValidationSaga);
}
