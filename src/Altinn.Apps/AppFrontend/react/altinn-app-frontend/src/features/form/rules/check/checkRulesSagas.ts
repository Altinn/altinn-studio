import { SagaIterator } from 'redux-saga';
import { all, call, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeState } from '../../../../types';
import { checkIfRuleShouldRun } from '../../../../utils/rules';
import FormDataActions from '../../data/formDataActions';
import { IFormData } from '../../data/formDataReducer';
import { IDataModelState } from '../../datamodel/formDatamodelReducer';
import { IRuleConnections } from '../../dynamics';
import { ILayoutState } from '../../layout/formLayoutReducer';
import * as RuleActions from './checkRulesActions';
import * as ActionTypes from '../rulesActionTypes';

const selectRuleConnection = (state: IRuntimeState): IRuleConnections => state.formDynamics.ruleConnection;
const selectFormDataConnection = (state: IRuntimeState): IFormData => state.formData;
const selectFormLayoutConnection = (state: IRuntimeState): ILayoutState => state.formLayout;
const selectFormdataModelConnection = (state: IRuntimeState): IDataModelState => state.formDataModel;

export interface IResponse {
  ruleShouldRun: boolean;
  dataBindingName: string;
  componentId: string;
  result: string;
}

function* checkIfRuleShouldRunSaga({
  lastUpdatedComponentId,
  lastUpdatedDataBinding,
  lastUpdatedDataValue,
  repeatingContainerId,
}: RuleActions.ICheckIfRuleShouldRun): SagaIterator {
  try {
    const ruleConnectionState: IRuleConnections = yield select(selectRuleConnection);
    const formDataState: IFormData = yield select(selectFormDataConnection);
    const formLayoutState: ILayoutState = yield select(selectFormLayoutConnection);
    const formDataModelState: IDataModelState = yield select(selectFormdataModelConnection);

    const rules: IResponse[] = checkIfRuleShouldRun(
      ruleConnectionState,
      formDataState,
      formDataModelState,
      formLayoutState,
      repeatingContainerId,
      lastUpdatedDataBinding,
    );

    if (rules.length > 0) {
      yield all(rules.map((rule) => call(FormDataActions.updateFormData, rule.dataBindingName, rule.result,
        rule.componentId)));
    }

  } catch (err) {
    yield call(
      console.error,
      'Oh noes',
      err,
    );
  }
}

export function* watchCheckIfRuleShouldRunSaga(): SagaIterator {
  yield takeLatest(ActionTypes.CHECK_IF_RULE_SHOULD_RUN, checkIfRuleShouldRunSaga);
}
