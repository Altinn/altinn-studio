import { SagaIterator } from 'redux-saga';
import { actionChannel, call, select, take } from 'redux-saga/effects';

import { IRuntimeState } from '../../../../../types';
import { IComponentValidations } from '../../../../../types/global';
import { getLayoutComponentById } from '../../../../../utils/layout';
import { validateComponentFormData } from '../../../../../utils/validation';
import FormDynamicActions from '../../../dynamics/actions';
import FormValidationActions from '../../../validation/actions';
import FormDataActions from '../../actions';
import * as FormDataActionTypes from '../../actions/types';
import { IUpdateFormData } from '../../actions/update';

function* updateFormDataSaga({ field, data, componentId }: IUpdateFormData): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const component = getLayoutComponentById(componentId, state.formLayout.layout);
    const dataModelField = state.formDataModel.dataModel.find((element: any) => element.DataBindingName === field);
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

    yield call(FormValidationActions.updateComponentValidations, componentValidations, componentId);
    yield call(FormDynamicActions.checkIfConditionalRulesShouldRun);
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
