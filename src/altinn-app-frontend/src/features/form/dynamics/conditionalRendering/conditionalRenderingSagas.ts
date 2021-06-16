import { SagaIterator } from 'redux-saga';
import { all, call, put, select, take, takeLatest } from 'redux-saga/effects';
import { IRuntimeState, IValidations, IUiConfig } from 'src/types';
import { runConditionalRenderingRules } from '../../../../utils/conditionalRendering';
import FormDataActions from '../../data/formDataActions';
import { IFormData } from '../../data/formDataReducer';
import { FormLayoutActions } from '../../layout/formLayoutSlice';
import { updateValidations } from '../../validation/validationSlice';
import * as FormDynamicsActionTypes from '../formDynamicsActionTypes';
import { IConditionalRenderingRules } from '../types';
import * as RulesActionTypes from '../../rules/rulesActionTypes';

export const ConditionalRenderingSelector:
  (store: IRuntimeState) => any = (store: IRuntimeState) => store.formDynamics.conditionalRendering;
export const FormDataSelector: (store: IRuntimeState) => IFormData = (store) => store.formData.formData;
export const UiConfigSelector: (store: IRuntimeState) => IUiConfig = (store) => store.formLayout.uiConfig;
export const FormValidationSelector: (store: IRuntimeState) =>
  IValidations = (store) => store.formValidations.validations;

function* checkIfConditionalRulesShouldRunSaga(): SagaIterator {
  try {
    const conditionalRenderingState: IConditionalRenderingRules = yield select(ConditionalRenderingSelector);
    const formData: IFormData = yield select(FormDataSelector);
    const formValidations: IValidations = yield select(FormValidationSelector);
    const uiConfig: IUiConfig = yield select(UiConfigSelector);
    const componentsToHide: string[] = runConditionalRenderingRules(
      conditionalRenderingState,
      formData,
      uiConfig.repeatingGroups,
    );

    if (shouldHidddenFieldsUpdate(uiConfig.hiddenFields, componentsToHide)) {
      yield put(FormLayoutActions.updateHiddenComponents({ componentsToHide }));
      componentsToHide.forEach((componentId) => {
        if (formValidations[componentId]) {
          const newFormValidations = formValidations;
          delete formValidations[componentId];
          updateValidations({ validations: newFormValidations });
        }
      });
    }
  } catch (err) {
    yield call(console.error, err);
  }
}

export function* watchCheckIfConditionalRulesShouldRunSaga(): SagaIterator {
  yield takeLatest(FormDynamicsActionTypes.CHECK_IF_CONDITIONAL_RULE_SHOULD_RUN, checkIfConditionalRulesShouldRunSaga);
}

export function* waitForAppSetupBeforeRunningConditionalRulesSaga(): SagaIterator {
  while (true) {
    yield all([
      take(FormLayoutActions.fetchLayoutFulfilled),
      take(FormDataActions.fetchFormDataFulfilled),
      take(FormDynamicsActionTypes.FETCH_SERVICE_CONFIG_FULFILLED),
      take(RulesActionTypes.FETCH_RULE_MODEL_FULFILLED),
    ]);
    yield call(checkIfConditionalRulesShouldRunSaga);
  }
}

function shouldHidddenFieldsUpdate(currentList: string[], newList: string[]): boolean {
  if (!currentList || currentList.length !== newList.length) {
    return true;
  }

  if (!currentList && newList && newList.length > 0) {
    return true;
  }

  if (currentList.find((element) => !newList.includes(element))) {
    return true;
  }

  return false;
}
