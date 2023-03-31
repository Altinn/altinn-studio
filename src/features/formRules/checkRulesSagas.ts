import { all, call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/formData/formDataSlice';
import { checkIfRuleShouldRun } from 'src/utils/rules';
import type { IRuleConnections } from 'src/features/dynamics';
import type { IFormDataState } from 'src/features/formData';
import type { IUpdateFormDataFulfilled } from 'src/features/formData/formDataTypes';
import type { ILayoutState } from 'src/features/layout/formLayoutSlice';
import type { IRuntimeState } from 'src/types';

const selectRuleConnection = (state: IRuntimeState): IRuleConnections | null => state.formDynamics.ruleConnection;
const selectFormDataConnection = (state: IRuntimeState): IFormDataState => state.formData;
const selectFormLayoutConnection = (state: IRuntimeState): ILayoutState => state.formLayout;

export interface IResponse {
  ruleShouldRun: boolean;
  dataBindingName: string;
  componentId: string;
  result: string;
}

export function* checkIfRuleShouldRunSaga({
  payload: { field, skipAutoSave, skipValidation, singleFieldValidation },
}: PayloadAction<IUpdateFormDataFulfilled>): SagaIterator {
  try {
    const ruleConnectionState: IRuleConnections | null = yield select(selectRuleConnection);
    const formDataState: IFormDataState = yield select(selectFormDataConnection);
    const formLayoutState: ILayoutState = yield select(selectFormLayoutConnection);
    const rules: IResponse[] = checkIfRuleShouldRun(ruleConnectionState, formDataState, formLayoutState.layouts, field);

    if (rules.length > 0) {
      yield all(
        rules.map((rule) => {
          const currentFormDataForField = formDataState.formData[rule.dataBindingName];
          if (currentFormDataForField === rule.result) {
            return undefined as any;
          }

          return put(
            FormDataActions.update({
              componentId: rule.componentId,
              data: rule.result,
              field: rule.dataBindingName,
              skipValidation,
              skipAutoSave,
              singleFieldValidation,
            }),
          );
        }),
      );
    }
  } catch (err) {
    yield call(console.error, 'Unhandled error when running rule handler', err);
  }
}
