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
import type { ILayouts } from 'src/layout/layout';
import type { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import type { ILayoutSets, IRuntimeState, ITextResource, IValidationIssue, IValidations } from 'src/types';
import type { IInstance } from 'src/types/shared';

export const selectFormLayoutState = (state: IRuntimeState) => state.formLayout;
export const selectLayoutsState = (state: IRuntimeState) => state.formLayout.layouts;
export const selectApplicationMetadataState = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;
export const selectInstanceState = (state: IRuntimeState) => state.instanceData.instance;
export const selectLayoutSetsState = (state: IRuntimeState) => state.formLayout.layoutsets;
export const selectTextResourcesState = (state: IRuntimeState) => state.textResources.resources;
export const selectValidationsState = (state: IRuntimeState) => state.formValidations.validations;
export const selectHiddenFieldsState = (state: IRuntimeState) => state.formLayout.uiConfig.hiddenFields;

export function* runSingleFieldValidationSaga({
  payload: { componentId, layoutId, dataModelBinding },
}: PayloadAction<IRunSingleFieldValidation>): SagaIterator {
  // Reject validation if field is hidden
  let hiddenFields: string[] = yield select(selectHiddenFieldsState);
  if (hiddenFields.includes(componentId)) {
    yield put(ValidationActions.runSingleFieldValidationRejected({}));
    return;
  }

  const applicationMetadata: IApplicationMetadata = yield select(selectApplicationMetadataState);
  const instance: IInstance = yield select(selectInstanceState);
  const layoutSets: ILayoutSets = yield select(selectLayoutSetsState);

  const currentTaskDataId: string | undefined =
    applicationMetadata && getCurrentTaskDataElementId(applicationMetadata, instance, layoutSets);
  const url: string | undefined = instance && currentTaskDataId && getDataValidationUrl(instance.id, currentTaskDataId);

  if (url && dataModelBinding) {
    const options: AxiosRequestConfig = {
      headers: {
        ValidationTriggerField: dataModelBinding,
      },
    };

    try {
      const layouts: ILayouts = yield select(selectLayoutsState);
      const textResources: ITextResource[] = yield select(selectTextResourcesState);
      const serverValidation: IValidationIssue[] = yield call(get, url, options);

      const mappedValidations: IValidations = mapDataElementValidationToRedux(
        serverValidation,
        layouts || {},
        textResources,
      );
      const validationsFromState: IValidations = yield select(selectValidationsState);
      const validations: IValidations = mergeValidationObjects(validationsFromState, mappedValidations);

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

      // Reject validation if field has been set to hidden in the time after we sent the validation request
      hiddenFields = yield select(selectHiddenFieldsState);
      if (hiddenFields.includes(componentId)) {
        yield put(ValidationActions.runSingleFieldValidationRejected({}));
        return;
      }

      yield put(ValidationActions.runSingleFieldValidationFulfilled({ validations }));
    } catch (error) {
      yield put(ValidationActions.runSingleFieldValidationRejected({ error }));
    }
  }
}
