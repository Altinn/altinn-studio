import { SagaIterator } from 'redux-saga';
import { actionChannel, call, select, take } from 'redux-saga/effects';

import { IRuntimeState } from '../../../../types';
import { IComponentValidations } from '../../../../types/global';
import { getLayoutComponentById } from '../../../../utils/layout';
import { validateComponentFormData } from '../../../../utils/validation';
import FormDynamicActions from '../../dynamics/formDynamicsActions';
import FormValidationActions from '../../validation/validationActions';
import FormDataActions from '../formDataActions';
import * as FormDataActionTypes from '../formDataActionTypes';
import { IUpdateFormData } from '../update/updateFormDataActions';
import FormLayoutActions from '../../layout/formLayoutActions';

function* updateFormDataSaga({ field, data, componentId }: IUpdateFormData): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const component = getLayoutComponentById(componentId, state.formLayout.layout);
    const dataModelField = state.formDataModel.dataModel.find((element: any) => element.dataBindingName === field);
    const focus = state.formLayout.uiConfig.focus;
    const componentValidations: IComponentValidations = validateComponentFormData(
      data,
      dataModelField,
      component,
      state.language.language,
      state.formValidations.validations[componentId],
    );

    if (state.formData.formData[field] !== data) {
      yield call(FormDataActions.updateFormDataFulfilled, field, data);
    }

    if (componentValidations) {
      yield call(FormValidationActions.updateComponentValidations, componentValidations, componentId);
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

export function* watchUpdateFormDataSaga(): SagaIterator {
  const requestChan = yield actionChannel(FormDataActionTypes.UPDATE_FORM_DATA);
  while (true) {
    const value = yield take(requestChan);
    yield call(updateFormDataSaga, value);
  }
}
