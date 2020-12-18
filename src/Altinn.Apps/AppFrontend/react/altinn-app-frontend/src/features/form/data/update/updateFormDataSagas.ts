import { SagaIterator } from 'redux-saga';
import { actionChannel, call, select, take } from 'redux-saga/effects';
import { IRuntimeState, IValidationResult } from 'src/types';
import { getLayoutComponentById, getLayoutIdForComponent } from '../../../../utils/layout';
import { createValidator, validateComponentFormData } from '../../../../utils/validation';
import FormDynamicActions from '../../dynamics/formDynamicsActions';
import FormValidationActions from '../../validation/validationActions';
import FormDataActions from '../formDataActions';
import * as FormDataActionTypes from '../formDataActionTypes';
import { IUpdateFormData } from './updateFormDataActions';
import FormLayoutActions from '../../layout/formLayoutActions';
import { getDataTaskDataTypeId } from '../../../../utils/appMetadata';
import { getKeyWithoutIndex } from '../../../../utils/databindings';

function* updateFormDataSaga({
  field,
  data,
  componentId,
}: IUpdateFormData): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const currentDataTaskDataTypeId = getDataTaskDataTypeId(
      state.instanceData.instance.process.currentTask.elementId,
      state.applicationMetadata.applicationMetadata.dataTypes,
    );
    const schema = state.formDataModel.schemas[currentDataTaskDataTypeId];
    const validator = createValidator(schema);
    const component = getLayoutComponentById(componentId, state.formLayout.layouts);
    const layoutId = getLayoutIdForComponent(componentId, state.formLayout.layouts);
    const fieldWithoutIndex = getKeyWithoutIndex(field);

    const focus = state.formLayout.uiConfig.focus;
    const validationResult: IValidationResult = validateComponentFormData(
      layoutId,
      data,
      fieldWithoutIndex,
      component,
      state.language.language,
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

    if (shouldUpdateFormData(state.formData.formData[field], data)) {
      yield call(FormDataActions.updateFormDataFulfilled, field, data);
    }

    yield call(
      FormValidationActions.updateComponentValidations,
      layoutId,
      componentValidations,
      componentId,
      updatedInvalidDataComponents,
    );
    if (state.formDynamics.conditionalRendering) {
      yield call(FormDynamicActions.checkIfConditionalRulesShouldRun);
    }

    if (focus && focus !== '' && componentId !== focus) {
      yield call(FormLayoutActions.updateFocus, '');
    }
  } catch (err) {
    console.error(err);
    yield call(FormDataActions.updateFormDataRejected, err);
  }
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
  const requestChan = yield actionChannel(FormDataActionTypes.UPDATE_FORM_DATA);
  while (true) {
    const value = yield take(requestChan);
    yield call(updateFormDataSaga, value);
  }
}
