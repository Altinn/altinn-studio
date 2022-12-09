import { call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AxiosRequestConfig } from 'axios';
import type { SagaIterator } from 'redux-saga';

import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { getCurrentTaskDataElementId } from 'src/utils/appMetadata';
import { get } from 'src/utils/network/networking';
import { getDataValidationUrl } from 'src/utils/urls/appUrlHelper';
import { mapDataElementValidationToRedux, mergeValidationObjects } from 'src/utils/validation';
import type { IRunSingleFieldValidation } from 'src/features/form/validation/validationSlice';
import type { IRuntimeState, IValidationIssue } from 'src/types';

export function* runSingleFieldValidationSaga({
  payload: { componentId, layoutId, dataModelBinding },
}: PayloadAction<IRunSingleFieldValidation>): SagaIterator {
  const state: IRuntimeState = yield select();
  const currentTaskDataId =
    state.applicationMetadata.applicationMetadata &&
    getCurrentTaskDataElementId(
      state.applicationMetadata.applicationMetadata,
      state.instanceData.instance,
      state.formLayout.layoutsets,
    );
  const url =
    state.instanceData.instance &&
    currentTaskDataId &&
    getDataValidationUrl(state.instanceData.instance.id, currentTaskDataId);

  if (url && dataModelBinding) {
    const options: AxiosRequestConfig = {
      headers: {
        ValidationTriggerField: dataModelBinding,
      },
    };

    try {
      const serverValidation: IValidationIssue[] = yield call(get, url, options);
      const mappedValidations = mapDataElementValidationToRedux(
        serverValidation,
        state.formLayout.layouts || {},
        state.textResources.resources,
      );

      const validations = mergeValidationObjects(state.formValidations.validations, mappedValidations);

      // Replace/reset validations for field that triggered validation
      if (serverValidation.length === 0 && validations[layoutId]?.[componentId]) {
        validations[layoutId][componentId].simpleBinding = {
          errors: [],
          warnings: [],
        };
      } else if (mappedValidations[layoutId]?.[componentId]) {
        if (!validations[layoutId]) {
          validations[layoutId] = {};
        }
        validations[layoutId][componentId] = mappedValidations[layoutId][componentId];
      }

      yield put(ValidationActions.runSingleFieldValidationFulfilled({ validations }));
    } catch (error) {
      yield put(ValidationActions.runSingleFieldValidationRejected({ error }));
    }
  }
}
