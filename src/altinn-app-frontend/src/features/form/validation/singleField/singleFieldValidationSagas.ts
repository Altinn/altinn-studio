import { call, put, select } from 'redux-saga/effects';
import type { AxiosRequestConfig } from 'axios';
import type { SagaIterator } from 'redux-saga';

import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { getCurrentTaskDataElementId } from 'src/utils/appMetadata';
import { getDataValidationUrl } from 'src/utils/appUrlHelper';
import { get } from 'src/utils/networking';
import {
  mapDataElementValidationToRedux,
  mergeValidationObjects,
} from 'src/utils/validation';
import type { IRuntimeState, IValidationIssue } from 'src/types';

export function* runSingleFieldValidationSaga(): SagaIterator {
  const state: IRuntimeState = yield select();
  const currentTaskDataId = getCurrentTaskDataElementId(
    state.applicationMetadata.applicationMetadata,
    state.instanceData.instance,
    state.formLayout.layoutsets,
  );
  const url = getDataValidationUrl(
    state.instanceData.instance.id,
    currentTaskDataId,
  );
  const { currentSingleFieldValidation } = state.formValidations;

  if (
    currentSingleFieldValidation &&
    currentSingleFieldValidation.dataModelBinding
  ) {
    const options: AxiosRequestConfig = {
      headers: {
        ValidationTriggerField: currentSingleFieldValidation.dataModelBinding,
      },
    };

    try {
      // Reset current single field validation for next potential validation
      yield put(ValidationActions.setCurrentSingleFieldValidation({}));

      const serverValidation: IValidationIssue[] = yield call(
        get,
        url,
        options,
      );
      const mappedValidations = mapDataElementValidationToRedux(
        serverValidation,
        state.formLayout.layouts,
        state.textResources.resources,
      );

      const validations = mergeValidationObjects(
        state.formValidations.validations,
        mappedValidations,
      );

      // Replace/reset validations for field that triggered validation
      const { layoutId, componentId } = currentSingleFieldValidation;
      if (
        serverValidation.length === 0 &&
        validations[layoutId]?.[componentId]
      ) {
        validations[layoutId][componentId].simpleBinding = {
          errors: [],
          warnings: [],
        };
      } else if (mappedValidations[layoutId]?.[componentId]) {
        if (!validations[layoutId]) {
          validations[layoutId] = {};
        }
        validations[layoutId][componentId] =
          mappedValidations[layoutId][componentId];
      }

      yield put(
        ValidationActions.runSingleFieldValidationFulfilled({ validations }),
      );
    } catch (error) {
      yield put(ValidationActions.runSingleFieldValidationRejected({ error }));
      yield put(ValidationActions.setCurrentSingleFieldValidation({}));
    }
  }
}
