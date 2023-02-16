import { call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { FormDynamicsActions } from 'src/features/form/dynamics/formDynamicsSlice';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { getCurrentDataTypeForApplication } from 'src/utils/appMetadata';
import { removeAttachmentReference } from 'src/utils/databindings';
import { getLayoutComponentById, getLayoutIdForComponent } from 'src/utils/layout';
import {
  getValidator,
  mergeComponentValidations,
  validateComponentFormData,
  validateComponentSpecificValidations,
} from 'src/utils/validation/validation';
import type { IFormData } from 'src/features/form/data';
import type { IDeleteAttachmentReference, IUpdateFormData } from 'src/features/form/data/formDataTypes';
import type { ILayoutComponent } from 'src/layout/layout';
import type { IAttachments } from 'src/shared/resources/attachments';
import type { IRuntimeState } from 'src/types';

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

    yield put(FormDynamicsActions.checkIfConditionalRulesShouldRun({}));
  } catch (error) {
    console.error(error);
    yield put(FormDataActions.updateRejected({ error }));
  }
}

function* runValidations(field: string, data: any, componentId: string | undefined, state: IRuntimeState) {
  if (!componentId) {
    yield put(
      FormDataActions.updateRejected({
        error: new Error('Missing component ID!'),
      }),
    );
    return;
  }
  if (!state.language.language) {
    return;
  }

  const layoutId = getLayoutIdForComponent(componentId, state.formLayout.layouts || {});

  if (!layoutId) {
    console.error('Failed to find layout ID for component', componentId);
    return;
  }

  const currentDataTypeId = getCurrentDataTypeForApplication({
    application: state.applicationMetadata.applicationMetadata,
    instance: state.instanceData.instance,
    layoutSets: state.formLayout.layoutsets,
  });
  const validator = getValidator(currentDataTypeId, state.formDataModel.schemas);
  const component = getLayoutComponentById(componentId, state.formLayout.layouts) as ILayoutComponent;

  const validationResult = validateComponentFormData(
    layoutId,
    data,
    field,
    component,
    state.language.language,
    state.textResources.resources,
    validator,
    state.formValidations.validations[componentId],
    componentId !== component.id ? componentId : null,
  );

  const componentValidations = validationResult?.validations[layoutId][componentId];
  const componentSpecificValidations = validateComponentSpecificValidations(data, component, state.language.language);
  const mergedValidations = mergeComponentValidations(componentValidations ?? {}, componentSpecificValidations);

  const invalidDataComponents = state.formValidations.invalidDataTypes || [];
  const updatedInvalidDataComponents = invalidDataComponents.filter((item) => item !== field);
  if (validationResult?.invalidDataTypes) {
    updatedInvalidDataComponents.push(field);
  }

  yield put(
    ValidationActions.updateComponentValidations({
      componentId,
      layoutId,
      validations: mergedValidations ?? {},
      invalidDataTypes: updatedInvalidDataComponents,
    }),
  );
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
    yield put(FormDataActions.save({ componentId }));
  } catch (err) {
    console.error(err);
  }
}
