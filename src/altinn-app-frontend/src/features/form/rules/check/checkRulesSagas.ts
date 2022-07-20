import { all, call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { checkIfRuleShouldRun } from 'src/utils/rules';
import type { IFormDataState } from 'src/features/form/data';
import type { IUpdateFormDataFulfilled } from 'src/features/form/data/formDataTypes';
import type { IRuleConnections } from 'src/features/form/dynamics';
import type { ILayoutState } from 'src/features/form/layout/formLayoutSlice';
import type { IRuntimeState } from 'src/types';

const selectRuleConnection = (state: IRuntimeState): IRuleConnections =>
  state.formDynamics.ruleConnection;
const selectFormDataConnection = (state: IRuntimeState): IFormDataState =>
  state.formData;
const selectFormLayoutConnection = (state: IRuntimeState): ILayoutState =>
  state.formLayout;

export interface IResponse {
  ruleShouldRun: boolean;
  dataBindingName: string;
  componentId: string;
  result: string;
}

export function* checkIfRuleShouldRunSaga({
  payload: { field, checkIfRequired, skipAutoSave, skipValidation },
}: PayloadAction<IUpdateFormDataFulfilled>): SagaIterator {
  try {
    const ruleConnectionState: IRuleConnections = yield select(
      selectRuleConnection,
    );
    const formDataState: IFormDataState = yield select(
      selectFormDataConnection,
    );
    const formLayoutState: ILayoutState = yield select(
      selectFormLayoutConnection,
    );

    const rules: IResponse[] = checkIfRuleShouldRun(
      ruleConnectionState,
      formDataState,
      formLayoutState.layouts,
      field,
    );

    if (rules.length > 0) {
      yield all(
        rules.map((rule) => {
          const currentFormDataForField =
            formDataState.formData[rule.dataBindingName];
          if (currentFormDataForField === rule.result) {
            return;
          }

          return put(
            FormDataActions.update({
              componentId: rule.componentId,
              data: rule.result,
              field: rule.dataBindingName,
              skipValidation,
              checkIfRequired,
              skipAutoSave,
            }),
          );
        }),
      );
    }
  } catch (err) {
    yield call(console.error, 'Oh noes', err);
  }
}
