import { PayloadAction } from '@reduxjs/toolkit';
import { SagaIterator } from 'redux-saga';
import { all, call, put, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeState } from '../../../../types';
import { checkIfRuleShouldRun } from '../../../../utils/rules';
import FormDataActions from '../../data/formDataActions';
import { IFormDataState } from '../../data/formDataReducer';
import { IUpdateFormDataFulfilled } from '../../data/formDataTypes';
import { IRuleConnections } from '../../dynamics';
import { ILayoutState } from '../../layout/formLayoutSlice';

const selectRuleConnection = (state: IRuntimeState): IRuleConnections => state.formDynamics.ruleConnection;
const selectFormDataConnection = (state: IRuntimeState): IFormDataState => state.formData;
const selectFormLayoutConnection = (state: IRuntimeState): ILayoutState => state.formLayout;

export interface IResponse {
  ruleShouldRun: boolean;
  dataBindingName: string;
  componentId: string;
  result: string;
}

function* checkIfRuleShouldRunSaga({
  payload: {
    field
  },
}: PayloadAction<IUpdateFormDataFulfilled>): SagaIterator {
  try {
    const ruleConnectionState: IRuleConnections = yield select(selectRuleConnection);
    const formDataState: IFormDataState = yield select(selectFormDataConnection);
    const formLayoutState: ILayoutState = yield select(selectFormLayoutConnection);

    const rules: IResponse[] = checkIfRuleShouldRun(
      ruleConnectionState,
      formDataState,
      formLayoutState.layouts,
      field,
    );

    if (rules.length > 0) {
      yield all(rules.map((rule) => {
        const currentFormDataForField = formDataState.formData[rule.dataBindingName];
        if (currentFormDataForField === rule.result) {
          return;
        }

        return put(FormDataActions.updateFormData({
          componentId: rule.componentId,
          data: rule.result,
          field: rule.dataBindingName,
        }));
      }));
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
  yield takeLatest([
    FormDataActions.updateFormDataFulfilled,
    FormDataActions.updateFormDataSkipAutosave
  ], checkIfRuleShouldRunSaga);
}
