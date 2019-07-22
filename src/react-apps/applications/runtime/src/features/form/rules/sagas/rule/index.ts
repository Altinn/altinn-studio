import { SagaIterator } from 'redux-saga';
import { all, call, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeState } from '../../../../../types';
import { checkIfRuleShouldRun } from '../../../../../utils/rules';
import FormDataActions from '../../../data/actions';
import { IFormData } from '../../../data/reducer';
import { IDataModelState } from '../../../datamodell/reducer';
import { IRuleConnections } from '../../../dynamics/';
import { ILayoutState } from '../../../layout/reducer';
import * as RuleActions from '../../actions/rule';
import * as ActionTypes from '../../actions/types';

const selectRuleConnection = (state: IRuntimeState): IRuleConnections => state.formDynamics.ruleConnection;
const selectFormDataConnection = (state: IRuntimeState): IFormData => state.formData;
const selectFormLayoutConnection = (state: IRuntimeState): ILayoutState => state.formLayout;
const selectFormdataModelConnection = (state: IRuntimeState): IDataModelState => state.formDataModel;

export interface IResponse {
  ruleShouldRun: boolean;
  dataBindingName: string;
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
      const component = formLayoutState.layout.find((comp: any) => comp.id === lastUpdatedComponentId);

      yield all(rules.map((rule) => call(FormDataActions.updateFormData, rule.dataBindingName, rule.result,
        component.id)));
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
