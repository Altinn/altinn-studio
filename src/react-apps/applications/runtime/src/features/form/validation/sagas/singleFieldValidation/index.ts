import { AxiosRequestConfig } from 'axios';
import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeStore } from '../../../../../types/global';
import { convertDataBindingToModel } from '../../../../../utils/databindings';
import { put } from '../../../../../utils/networking';
import { mapApiValidationsToRedux } from '../../../../../utils/validation';
import Actions from '../../actions';
import { IRunSingleFieldValidationAction } from '../../actions/singleFieldValidation';
import * as ActionTypes from '../../actions/types';

export function* runSingleFieldValidationSaga({
  url,
  dataModelBinding,
}: IRunSingleFieldValidationAction): SagaIterator {
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
      const validationErrors = mapApiValidationsToRedux(response.validationResult.messages, state.formLayout.layout);
      yield call(Actions.runSingleFieldValidationFulfilled, validationErrors);
    }
  } catch (err) {
    yield call(Actions.runSingleFieldValidationRejected, err);
  }
}

export function* watchRunSingleFieldValidationSaga(): SagaIterator {
  yield takeLatest(ActionTypes.RUN_SINGLE_FIELD_VALIDATION, runSingleFieldValidationSaga);
}
