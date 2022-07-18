import type { SagaIterator } from 'redux-saga';
import { call, put, select } from 'redux-saga/effects';
import type { IRuntimeState, IValidationResult } from 'src/types';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  getLayoutComponentById,
  getLayoutIdForComponent,
} from '../../../../utils/layout';
import {
  getValidator,
  validateComponentFormData,
} from '../../../../utils/validation';
import { FormDynamicsActions } from '../../dynamics/formDynamicsSlice';
import { ValidationActions } from '../../validation/validationSlice';
import { FormDataActions } from '../formDataSlice';
import type {
  IUpdateFormData,
  IDeleteAttachmentReference,
} from '../formDataTypes';
import { FormLayoutActions } from '../../layout/formLayoutSlice';
import { getCurrentDataTypeForApplication } from '../../../../utils/appMetadata';
import { removeAttachmentReference } from 'src/utils/databindings';
import type { IFormData } from 'src/features/form/data';
import type { ILayouts, ILayoutComponent } from 'src/features/form/layout';
import type { IAttachments } from 'src/shared/resources/attachments';

export function* updateFormDataSaga({
  payload: {
    field,
    data,
    componentId,
    skipValidation,
    skipAutoSave,
    checkIfRequired,
  },
}: PayloadAction<IUpdateFormData>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const focus = state.formLayout.uiConfig.focus;

    if (!skipValidation) {
      yield call(
        runValidations,
        field,
        data,
        componentId,
        state,
        checkIfRequired,
      );
    }

    if (shouldUpdateFormData(state.formData.formData[field], data)) {
      yield put(
        FormDataActions.updateFulfilled({
          field,
          data,
          skipValidation,
          skipAutoSave,
          checkIfRequired,
        }),
      );
    }

    if (state.formDynamics.conditionalRendering) {
      yield put(FormDynamicsActions.checkIfConditionalRulesShouldRun({}));
    }

    if (focus && focus !== '' && componentId !== focus) {
      yield put(FormLayoutActions.updateFocus({ currentComponentId: '' }));
    }
  } catch (error) {
    console.error(error);
    yield put(FormDataActions.updateRejected({ error }));
  }
}

function* runValidations(
  field: string,
  data: any,
  componentId: string,
  state: IRuntimeState,
  checkIfRequired: boolean,
) {
  if (!componentId) {
    yield put(
      FormDataActions.updateRejected({
        error: new Error('Missing component ID!'),
      }),
    );
  }

  const currentDataTypeId = getCurrentDataTypeForApplication({
    application: state.applicationMetadata.applicationMetadata,
    instance: state.instanceData.instance,
    layoutSets: state.formLayout.layoutsets,
  });
  const validator = getValidator(
    currentDataTypeId,
    state.formDataModel.schemas,
  );
  const component = getLayoutComponentById(
    componentId,
    state.formLayout.layouts,
  ) as ILayoutComponent;
  const layoutId = getLayoutIdForComponent(
    componentId,
    state.formLayout.layouts,
  );

  const validationResult: IValidationResult = validateComponentFormData(
    layoutId,
    data,
    field,
    component,
    state.language.language,
    state.textResources.resources,
    validator,
    state.formValidations.validations[componentId],
    componentId !== component.id ? componentId : null,
    checkIfRequired,
  );

  const componentValidations =
    validationResult?.validations[layoutId][componentId];
  const invalidDataComponents = state.formValidations.invalidDataTypes || [];
  const updatedInvalidDataComponents = invalidDataComponents.filter(
    (item) => item !== field,
  );
  if (validationResult?.invalidDataTypes) {
    updatedInvalidDataComponents.push(field);
  }

  yield put(
    ValidationActions.updateComponentValidations({
      componentId,
      layoutId,
      validations: componentValidations,
      invalidDataTypes: updatedInvalidDataComponents,
    }),
  );
}

function shouldUpdateFormData(currentData: any, newData: any): boolean {
  if (newData && newData !== '' && !currentData) {
    return true;
  }

  if (currentData !== newData) {
    return true;
  }

  return false;
}

export const SelectFormData = (s: IRuntimeState) => s.formData.formData;
export const SelectLayouts = (s: IRuntimeState) => s.formLayout.layouts;
export const SelectAttachments = (s: IRuntimeState) =>
  s.attachments.attachments;
export const SelectCurrentView = (s: IRuntimeState) =>
  s.formLayout.uiConfig.currentView;

export function* deleteAttachmentReferenceSaga({
  payload: { attachmentId, componentId, dataModelBindings },
}: PayloadAction<IDeleteAttachmentReference>): SagaIterator {
  try {
    const formData: IFormData = yield select(SelectFormData);
    const layouts: ILayouts = yield select(SelectLayouts);
    const attachments: IAttachments = yield select(SelectAttachments);
    const currentView: string = yield select(SelectCurrentView);
    const layout = layouts[currentView];

    const updatedFormData = removeAttachmentReference(
      formData,
      attachmentId,
      layout,
      attachments,
      dataModelBindings,
      componentId,
    );

    yield put(FormDataActions.setFulfilled({ formData: updatedFormData }));
    yield put(FormDataActions.save());
  } catch (err) {
    console.error(err);
  }
}
