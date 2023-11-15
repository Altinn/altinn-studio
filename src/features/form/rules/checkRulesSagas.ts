import { all, call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/formData/formDataSlice';
import { checkIfRuleShouldRun } from 'src/utils/rules';
import type { IRuleConnections } from 'src/features/form/dynamics';
import type { ILayoutState } from 'src/features/form/layout/formLayoutSlice';
import type { IFormData } from 'src/features/formData';
import type { IUpdateFormData } from 'src/features/formData/formDataTypes';
import type { IRuntimeState } from 'src/types';

const selectRuleConnection = (state: IRuntimeState): IRuleConnections | null => state.formDynamics.ruleConnection;
const selectFormData = (state: IRuntimeState): IFormData => state.formData.formData;
const selectFormLayoutConnection = (state: IRuntimeState): ILayoutState => state.formLayout;

export interface IResponse {
  ruleShouldRun: boolean;
  dataBindingName: string;
  componentId: string;
  result: string;
}

export function* checkIfRuleShouldRunSaga({
  payload: { field, skipAutoSave, skipValidation, singleFieldValidation },
}: PayloadAction<IUpdateFormData>): SagaIterator {
  try {
    const ruleConnectionState: IRuleConnections | null = yield select(selectRuleConnection);
    const formData: IFormData = yield select(selectFormData);
    const formLayoutState: ILayoutState = yield select(selectFormLayoutConnection);
    const rules: IResponse[] = checkIfRuleShouldRun(ruleConnectionState, formData, formLayoutState.layouts, field);

    if (rules.length > 0) {
      yield all(
        rules.map((rule) => {
          const currentFormDataForField = formData[rule.dataBindingName];
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
    yield call(window.logError, 'Unhandled error when running rule handler:\n', err);
  }
}
