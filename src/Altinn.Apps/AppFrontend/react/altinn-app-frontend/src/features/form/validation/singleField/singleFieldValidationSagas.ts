import { SagaIterator } from 'redux-saga';
import { call, put, select, takeLatest } from 'redux-saga/effects';
import { AxiosRequestConfig } from 'axios';
import { IRuntimeState, IValidationIssue } from 'src/types';
import { getDataValidationUrl } from 'src/utils/urlHelper2';
import { get } from 'src/utils/networking';
import { mapDataElementValidationToRedux, mergeValidationObjects } from '../../../../utils/validation';
import { runSingleFieldValidation,
  runSingleFieldValidationFulfilled,
  runSingleFieldValidationRejected,
  setCurrentSingleFieldValidation } from '../validationSlice';
import { getCurrentTaskDataElementId } from 'src/utils/appMetadata';

export function* runSingleFieldValidationSaga(): SagaIterator {
  const state: IRuntimeState = yield select();
  const currentTaskDataId = getCurrentTaskDataElementId(
    state.applicationMetadata.applicationMetadata,
    state.instanceData.instance,
  );
  const url = getDataValidationUrl(state.instanceData.instance.id, currentTaskDataId);
  const { currentSingleFieldValidation } = state.formValidations;

  if (currentSingleFieldValidation && currentSingleFieldValidation.dataModelBinding) {
    const options: AxiosRequestConfig = {
      headers: {
        ValidationTriggerField: currentSingleFieldValidation.dataModelBinding,
      },
    };

    try {
      // Reset current single field validation for next potential validation
      yield put(setCurrentSingleFieldValidation({}));

      const serverValidation: IValidationIssue[] = yield call(get, url, options);
      const mappedValidations =
      mapDataElementValidationToRedux(serverValidation, state.formLayout.layouts, state.textResources.resources);

      const validations = mergeValidationObjects(
        state.formValidations.validations, mappedValidations,
      );

      // Replace/reset validations for field that triggered validation
      const { layoutId, componentId } = currentSingleFieldValidation;
      if (serverValidation.length === 0 && validations[layoutId]?.[componentId]) {
        validations[layoutId][componentId].simpleBinding = { errors: [], warnings: [] };
      } else if (mappedValidations[layoutId]?.[componentId]) {
        if (!validations[layoutId]) {
          validations[layoutId] = {};
        }
        validations[layoutId][componentId] = mappedValidations[layoutId][componentId];
      }

      yield put(runSingleFieldValidationFulfilled({ validations }));
    } catch (error) {
      yield put(runSingleFieldValidationRejected({ error }));
      yield put(setCurrentSingleFieldValidation({}));
    }
  }
}

export function* watchRunSingleFieldValidationSaga(): SagaIterator {
  yield takeLatest(runSingleFieldValidation, runSingleFieldValidationSaga);
}
