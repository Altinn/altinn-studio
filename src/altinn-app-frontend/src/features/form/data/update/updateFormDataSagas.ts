import { SagaIterator } from 'redux-saga';
import { actionChannel, call, put, select, take, takeLatest } from 'redux-saga/effects';
import { IRuntimeState, IValidationResult } from 'src/types';
import { PayloadAction } from '@reduxjs/toolkit';
import { getLayoutComponentById, getLayoutIdForComponent } from '../../../../utils/layout';
import { getValidator, validateComponentFormData } from '../../../../utils/validation';
import FormDynamicActions from '../../dynamics/formDynamicsActions';
import { updateComponentValidations } from '../../validation/validationSlice';
import FormDataActions from '../formDataActions';
import type { IUpdateFormData, IDeleteAttachmentReference } from '../formDataTypes';
import { FormLayoutActions } from '../../layout/formLayoutSlice';
import { getCurrentDataTypeForApplication } from '../../../../utils/appMetadata';
import { removeAttachmentReference } from "src/utils/databindings";
import type { IFormData } from "src/features/form/data/formDataReducer";
import type { ILayouts } from "src/features/form/layout";
import type { IAttachments } from "src/shared/resources/attachments";

function* updateFormDataSaga({ payload: {
  field,
  data,
  componentId,
  skipValidation,
  skipAutoSave,
} }: PayloadAction<IUpdateFormData>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const focus = state.formLayout.uiConfig.focus;

    if (!skipValidation) {
      yield call(runValidations, field, data, componentId, state);
    }

    if (shouldUpdateFormData(state.formData.formData[field], data)) {
      if (!skipAutoSave) {
        yield put(FormDataActions.updateFormDataFulfilled({ field, data }));
      } else {
        yield put(FormDataActions.updateFormDataSkipAutosave({ field, data }));
      }
    }

    if (state.formDynamics.conditionalRendering) {
      yield call(FormDynamicActions.checkIfConditionalRulesShouldRun);
    }

    if (focus && focus !== '' && componentId !== focus) {
      yield put(FormLayoutActions.updateFocus({ currentComponentId: '' }));
    }
  } catch (error) {
    console.error(error);
    yield put(FormDataActions.updateFormDataRejected({ error }));
  }
}

function* runValidations(
  field: string,
  data: any,
  componentId: string,
  state: IRuntimeState,
) {
  if (!componentId) {
    yield put(FormDataActions.updateFormDataRejected({ error: new Error('Missing component ID!') }));
  }

  const currentDataTypeId = getCurrentDataTypeForApplication({
    application: state.applicationMetadata.applicationMetadata,
    instance: state.instanceData.instance,
    layoutSets: state.formLayout.layoutsets,
  });
  const validator = getValidator(currentDataTypeId, state.formDataModel.schemas);
  const component = getLayoutComponentById(componentId, state.formLayout.layouts);
  const layoutId = getLayoutIdForComponent(componentId, state.formLayout.layouts);

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
  );

  const componentValidations = validationResult?.validations[layoutId][componentId];
  const invalidDataComponents = state.formValidations.invalidDataTypes || [];
  const updatedInvalidDataComponents = invalidDataComponents.filter((item) => item !== field);
  if (validationResult?.invalidDataTypes) {
    updatedInvalidDataComponents.push(field);
  }

  yield put(updateComponentValidations({
    componentId,
    layoutId,
    validations: componentValidations,
    invalidDataTypes: updatedInvalidDataComponents,
  }));
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

export function* watchUpdateFormDataSaga(): SagaIterator {
  const requestChan = yield actionChannel(FormDataActions.updateFormData);
  while (true) {
    const value = yield take(requestChan);
    yield call(updateFormDataSaga, value);
  }
}

export const SelectFormData = (s: IRuntimeState) => s.formData.formData;
export const SelectLayouts = (s: IRuntimeState) => s.formLayout.layouts;
export const SelectAttachments = (s: IRuntimeState) => s.attachments.attachments;
export const SelectCurrentView = (s: IRuntimeState) => s.formLayout.uiConfig.currentView;

export function* deleteAttachmentReferenceSaga({ payload: {
  attachmentId,
  componentId,
  dataModelBindings
} }: PayloadAction<IDeleteAttachmentReference>): SagaIterator {
  try {
    const formData: IFormData = yield select(SelectFormData);
    const layouts: ILayouts = yield select(SelectLayouts);
    const attachments: IAttachments = yield select(SelectAttachments);
    const currentView:string = yield select(SelectCurrentView);
    const layout = layouts[currentView];

    const updatedFormData = removeAttachmentReference(formData, attachmentId, layout, attachments, dataModelBindings, componentId);

    yield put(FormDataActions.setFormDataFulfilled({ formData: updatedFormData }));
    yield put(FormDataActions.saveFormData());
  } catch (err) {
    console.error(err);
  }
}

export function* watchDeleteAttachmentReferenceSaga(): SagaIterator {
  yield takeLatest(FormDataActions.deleteAttachmentReference, deleteAttachmentReferenceSaga);
}
