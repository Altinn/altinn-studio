import { SagaIterator } from 'redux-saga';
import { call, put, select, takeLatest } from 'redux-saga/effects';
import { AxiosRequestConfig } from 'axios';
import { IRuntimeState } from 'src/types';
import { getDataValidationUrl } from 'src/utils/urlHelper';
import { getCurrentTaskDataElementId } from 'altinn-shared/utils';
import { get } from 'src/utils/networking';
import { mapDataElementValidationToRedux, mergeValidationObjects } from '../../../../utils/validation';
import { runSingleFieldValidation,
  runSingleFieldValidationFulfilled,
  runSingleFieldValidationRejected,
  setCurrentSingleFieldValidation } from '../validationSlice';

export function* runSingleFieldValidationSaga(): SagaIterator {
  const state: IRuntimeState = yield select();
  const currentTaskDataId = getCurrentTaskDataElementId(
    state.applicationMetadata.applicationMetadata,
    state.instanceData.instance,
  );
  const url = getDataValidationUrl(state.instanceData.instance.id, currentTaskDataId);
  const { currentSingleFieldValidation } = state.formValidations;

  if (currentSingleFieldValidation) {
    const options: AxiosRequestConfig = {
      headers: {
        ValidationTriggerField: currentSingleFieldValidation,
      },
    };

    try {
      // Reset current single field validation for next potential validation
      yield put(setCurrentSingleFieldValidation({ dataModelBinding: null }));

      const serverValidation: any = yield call(get, url, options);
      const mappedValidations =
      mapDataElementValidationToRedux(serverValidation, state.formLayout.layouts, state.textResources.resources);
      const validations = mergeValidationObjects(state.formValidations.validations, mappedValidations);
      yield put(runSingleFieldValidationFulfilled({ validations }));
    } catch (error) {
      yield put(runSingleFieldValidationRejected({ error }));
      yield put(setCurrentSingleFieldValidation({ dataModelBinding: null }));
    }
  }
}

export function* watchRunSingleFieldValidationSaga(): SagaIterator {
  yield takeLatest(runSingleFieldValidation, runSingleFieldValidationSaga);
}
