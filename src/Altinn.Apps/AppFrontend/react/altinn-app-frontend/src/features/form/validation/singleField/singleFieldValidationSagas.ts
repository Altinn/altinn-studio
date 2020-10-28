import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { AxiosRequestConfig } from 'axios';
import { IRuntimeState } from 'src/types';
import { getValidationUrl } from 'src/utils/urlHelper';
import { get } from '../../../../utils/networking';
import { mapDataElementValidationToRedux } from '../../../../utils/validation';
import Actions from '../validationActions';
import * as ActionTypes from '../validationActionTypes';
import FormValidationActions from '../validationActions';

export function* runSingleFieldValidationSaga(): SagaIterator {
  const state: IRuntimeState = yield select();
  const url = getValidationUrl(state.instanceData.instance.id);

  if (state.formValidations.currentSingleFieldValidation) {
    const options: AxiosRequestConfig = {
      headers: {
        ValidationTriggerField: state.formValidations.currentSingleFieldValidation,
      },
    };

    try {
      const serverValidation: any = yield call(get, url, options);
      const mappedValidations =
      mapDataElementValidationToRedux(serverValidation, state.formLayout.layouts, state.textResources.resources);
      FormValidationActions.updateValidations(mappedValidations);
      yield call(Actions.runSingleFieldValidationFulfilled, mappedValidations);
    } catch (err) {
      yield call(Actions.runSingleFieldValidationRejected, err);
    } finally {
      yield call(Actions.setCurrentSingleFieldValidation, null);
    }
  }
}

export function* watchRunSingleFieldValidationSaga(): SagaIterator {
  yield takeLatest(ActionTypes.RUN_SINGLE_FIELD_VALIDATION, runSingleFieldValidationSaga);
}
