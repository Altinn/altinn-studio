import { SagaIterator } from 'redux-saga';
import { actionChannel, call, put, select, take } from 'redux-saga/effects';
import { IRuntimeState, IValidationResult } from 'src/types';
import { PayloadAction } from '@reduxjs/toolkit';
import { getLayoutComponentById, getLayoutIdForComponent } from '../../../../utils/layout';
import { createValidator, validateComponentFormData } from '../../../../utils/validation';
import FormDynamicActions from '../../dynamics/formDynamicsActions';
import FormValidationActions from '../../validation/validationActions';
import FormDataActions from '../formDataActions';
import { IUpdateFormData } from '../formDataTypes';
import { FormLayoutActions } from '../../layout/formLayoutSlice';
import { getDataTaskDataTypeId } from '../../../../utils/appMetadata';
import { getKeyWithoutIndex } from '../../../../utils/databindings';
import { IDataModelState } from '../../datamodel/datamodelSlice';
import { ILayouts } from '../../layout';
import { IValidationState } from '../../validation/validationReducer';

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
      yield call(runValidations, field, data, componentId,
        state.instanceData.instance.process.currentTask.elementId,
        state.applicationMetadata.applicationMetadata.dataTypes,
        state.formValidations,
        state.formDataModel,
        state.formLayout.layouts,
        state.language.language);
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
  taskId: string,
  dataTypes: any[],
  formValidations: IValidationState,
  formDataModel: IDataModelState,
  layouts: ILayouts,
  language: any,
) {
  if (!componentId) {
    yield put(FormDataActions.updateFormDataRejected({ error: new Error('Missing componen ID!') }));
  }
  const currentDataTaskDataTypeId = getDataTaskDataTypeId(taskId, dataTypes);
  const schema = formDataModel.schemas[currentDataTaskDataTypeId];
  const validator = createValidator(schema);
  const component = getLayoutComponentById(componentId, layouts);
  const layoutId = getLayoutIdForComponent(componentId, layouts);
  const fieldWithoutIndex = getKeyWithoutIndex(field);

  const validationResult: IValidationResult = validateComponentFormData(
    layoutId,
    data,
    fieldWithoutIndex,
    component,
    language,
    validator,
    formValidations.validations[componentId],
    componentId !== component.id ? componentId : null,
  );

  const componentValidations = validationResult?.validations[layoutId][componentId];
  const invalidDataComponents = formValidations.invalidDataTypes || [];
  const updatedInvalidDataComponents = invalidDataComponents.filter((item) => item !== field);
  if (validationResult?.invalidDataTypes) {
    updatedInvalidDataComponents.push(field);
  }

  yield call(
    FormValidationActions.updateComponentValidations,
    layoutId,
    componentValidations,
    componentId,
    updatedInvalidDataComponents,
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

export function* watchUpdateFormDataSaga(): SagaIterator {
  const requestChan = yield actionChannel(FormDataActions.updateFormData);
  while (true) {
    const value = yield take(requestChan);
    yield call(updateFormDataSaga, value);
  }
}
