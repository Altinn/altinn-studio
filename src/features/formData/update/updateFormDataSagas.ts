import { call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/formData/formDataSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { implementsAnyValidation } from 'src/layout';
import { ResolvedNodesSelector } from 'src/utils/layout/hierarchy';
import { createComponentValidationResult, validationContextFromState } from 'src/utils/validation/validationHelpers';
import type { IFormData } from 'src/features/formData';
import type { IUpdateFormDataSimple } from 'src/features/formData/formDataTypes';
import type { IRuntimeState } from 'src/types';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

export function* updateFormDataSaga({
  payload: { field, data, componentId, skipValidation, skipAutoSave, singleFieldValidation },
}: PayloadAction<IUpdateFormDataSimple>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();

    if (!skipValidation) {
      yield call(runValidations, field, data, componentId, state);
    }

    if (shouldUpdateFormData(state.formData.formData[field], data)) {
      yield put(
        FormDataActions.updateFulfilled({
          field,
          componentId,
          data,
          skipValidation,
          skipAutoSave,
          singleFieldValidation,
        }),
      );
    }
  } catch (error) {
    window.logError('Update form data failed:\n', error);
  }
}

function* runValidations(
  field: string,
  data: string | null | undefined,
  componentId: string | undefined,
  state: IRuntimeState,
) {
  const resolvedNodes: LayoutPages = yield select(ResolvedNodesSelector);
  const node = componentId && resolvedNodes.findById(componentId);
  if (!node) {
    const error = new Error('Missing component ID!');
    window.logError('Failed to run validations on update form data:\n', error);
    return;
  }

  const overrideFormData: IFormData = {};
  if (typeof data === 'string' && data.length) {
    overrideFormData[field] = data;
  }

  if (implementsAnyValidation(node.def)) {
    const validationObjects = node.runValidations((node) => validationContextFromState(state, node), {
      overrideFormData,
      skipEmptyFieldValidation: true,
    });
    const validationResult = createComponentValidationResult(validationObjects);

    const invalidDataComponents = state.formValidations.invalidDataTypes || [];
    const updatedInvalidDataComponents = invalidDataComponents.filter((item) => item !== field);
    if (validationResult.invalidDataTypes) {
      updatedInvalidDataComponents.push(field);
    }

    yield put(
      ValidationActions.updateComponentValidations({
        componentId: node.item.id,
        pageKey: node.pageKey(),
        validationResult,
      }),
    );
  }
}

function shouldUpdateFormData(currentData: string | null | undefined, newData: string | null | undefined): boolean {
  if (newData && newData !== '' && !currentData) {
    return true;
  }

  return currentData !== newData;
}
