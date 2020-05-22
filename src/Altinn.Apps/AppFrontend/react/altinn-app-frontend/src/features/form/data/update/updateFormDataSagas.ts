import { SagaIterator } from 'redux-saga';
import { actionChannel, call, select, take } from 'redux-saga/effects';

import { IRuntimeState } from '../../../../types';
import { IValidationResult } from '../../../../types/global';
import { getLayoutComponentById } from '../../../../utils/layout';
import { createValidator, validateComponentFormData } from '../../../../utils/validation';
import FormDynamicActions from '../../dynamics/formDynamicsActions';
import FormValidationActions from '../../validation/validationActions';
import FormDataActions from '../formDataActions';
import * as FormDataActionTypes from '../formDataActionTypes';
import { IUpdateFormData } from './updateFormDataActions';
import FormLayoutActions from '../../layout/formLayoutActions';
import { getDataTaskDataTypeId } from '../../../../utils/appMetadata';

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
    const component = getLayoutComponentById(componentId, state.formLayout.layout);
    const focus = state.formLayout.uiConfig.focus;
    const validationResult: IValidationResult = validateComponentFormData(
      data,
      field,
      component,
      state.language.language,
      validator,
      state.formValidations.validations[componentId],
    );

    const componentValidations = validationResult?.validations[componentId];

    if (shouldUpdateFormData(state.formData.formData[field], data)) {
      yield call(FormDataActions.updateFormDataFulfilled, field, data);
    }

    if (componentValidations) {
      yield call(
        FormValidationActions.updateComponentValidations,
        componentValidations,
        componentId,
        validationResult.invalidDataTypes,
      );
    }
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
