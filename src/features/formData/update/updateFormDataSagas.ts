import { call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/formData/formDataSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { implementsAnyValidation } from 'src/layout';
import { removeAttachmentReference } from 'src/utils/databindings';
import { ResolvedNodesSelector } from 'src/utils/layout/hierarchy';
import { createComponentValidationResult, validationContextFromState } from 'src/utils/validation/validationHelpers';
import type { IAttachments } from 'src/features/attachments';
import type { IFormData } from 'src/features/formData';
import type { IDeleteAttachmentReference, IUpdateFormData } from 'src/features/formData/formDataTypes';
import type { IRuntimeState } from 'src/types';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

export function* updateFormDataSaga({
  payload: { field, data, componentId, skipValidation, skipAutoSave, singleFieldValidation },
}: PayloadAction<IUpdateFormData>): SagaIterator {
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
    yield put(FormDataActions.updateRejected({ error }));
  }
}

function* runValidations(field: string, data: any, componentId: string | undefined, state: IRuntimeState) {
  const resolvedNodes: LayoutPages = yield select(ResolvedNodesSelector);
  const node = componentId && resolvedNodes.findById(componentId);
  if (!node) {
    const error = new Error('Missing component ID!');
    window.logError('Failed to run validations on update form data:\n', error);
    yield put(
      FormDataActions.updateRejected({
        error,
      }),
    );
    return;
  }

  const overrideFormData = { [field]: data?.length ? data : undefined };

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

function shouldUpdateFormData(currentData: any, newData: any): boolean {
  if (newData && newData !== '' && !currentData) {
    return true;
  }

  return currentData !== newData;
}

export const SelectFormData = (s: IRuntimeState) => s.formData.formData;
export const SelectAttachments = (s: IRuntimeState) => s.attachments.attachments;

export function* deleteAttachmentReferenceSaga({
  payload: { attachmentId, componentId, dataModelBindings },
}: PayloadAction<IDeleteAttachmentReference>): SagaIterator {
  try {
    const formData: IFormData = yield select(SelectFormData);
    const attachments: IAttachments = yield select(SelectAttachments);

    const updatedFormData = removeAttachmentReference(
      formData,
      attachmentId,
      attachments,
      dataModelBindings,
      componentId,
    );

    yield put(FormDataActions.setFulfilled({ formData: updatedFormData }));
    yield put(FormDataActions.saveEvery({ componentId }));
  } catch (err) {
    window.logError('Delete attachment reference failed:\n', err);
  }
}
