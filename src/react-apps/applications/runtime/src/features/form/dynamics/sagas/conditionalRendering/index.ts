import { SagaIterator } from 'redux-saga';
import { all, call, select, take, takeLatest } from 'redux-saga/effects';
import { IRuntimeState } from '../../../../../types';
import { runConditionalRenderingRules } from '../../../../../utils/conditionalRendering';
import { getLayoutElementIndexById } from '../../../../../utils/formLayout';
import * as FormConfigActionTypes from '../../../config/actions/types';
import * as FormDataActionTypes from '../../../data/actions/types';
import { IFormData } from '../../../data/reducer';
import { ILayout } from '../../../layout';
import FormLayoutActions from '../../../layout/actions';
import * as FormLayoutActionTypes from '../../../layout/actions/types';
import * as FormDynamicsActionTypes from '../../actions/types';
import { IConditionalRenderingRules } from '../../types';

export const ConditionalRenderingSelector:
  (store: IRuntimeState) => any = (store: IRuntimeState) => store.formDynamics.conditionalRendering;
export const FormDataSelector: (store: IRuntimeState) => IFormData = (store) => store.formData.formData;
export const FormLayoutSelector: (store: IRuntimeState) => ILayout = (store) => store.formLayout.layout;

function* checkIfConditionalRulesShouldRunSaga(): SagaIterator {
  try {
    const conditionalRenderingState: IConditionalRenderingRules = yield select(ConditionalRenderingSelector);
    const formData: IFormData = yield select(FormDataSelector);
    const formLayout: ILayout = yield select(FormLayoutSelector);
    const updatedElements = runConditionalRenderingRules(conditionalRenderingState, formData, formLayout);
    updatedElements.forEach((element) => {
      const index = getLayoutElementIndexById(element.id, formLayout);
      FormLayoutActions.updateFormLayout(element, index);
    });
  } catch (err) {
    yield call(console.error, err);
  }
}

export function* watchCheckIfConditionalRulesShouldRunSaga(): SagaIterator {
  yield takeLatest(FormDynamicsActionTypes.CHECK_IF_CONDITIONAL_RULE_SHOULD_RUN, checkIfConditionalRulesShouldRunSaga);
}

export function* waitForAppSetupBeforeRunningConditionalRulesSaga(): SagaIterator {
  yield all([
    take(FormLayoutActionTypes.FETCH_FORM_LAYOUT_FULFILLED),
    take(FormConfigActionTypes.FETCH_FORM_CONFIG_FULFILLED),
    take(FormDataActionTypes.FETCH_FORM_DATA_FULFILLED),
    take(FormDynamicsActionTypes.FETCH_SERVICE_CONFIG_FULFILLED),
  ]);
  yield call(checkIfConditionalRulesShouldRunSaga, {});
}
