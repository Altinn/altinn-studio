import { all, call, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { checkIfConditionalRulesShouldRunSaga } from 'src/features/dynamics/conditionalRenderingSagas';
import { fetchDynamicsSaga } from 'src/features/dynamics/fetchFormDynamicsSagas';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { FormRulesActions } from 'src/features/formRules/rulesSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  ICheckIfConditionalRulesShouldRun,
  IFetchServiceConfigFulfilled,
  IFetchServiceConfigRejected,
  IFormDynamicState,
} from 'src/features/dynamics/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IFormDynamicState = {
  ruleConnection: {},
  conditionalRendering: {},
  apis: undefined,
  error: null,
};

export let FormDynamicsActions: ActionsFromSlice<typeof formDynamicsSlice>;
export const formDynamicsSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IFormDynamicState>) => ({
    name: 'formDynamics',
    initialState,
    actions: {
      checkIfConditionalRulesShouldRun: mkAction<ICheckIfConditionalRulesShouldRun>({
        takeLatest: checkIfConditionalRulesShouldRunSaga,
        saga: () =>
          function* (): SagaIterator {
            while (true) {
              yield all([
                take(FormLayoutActions.fetchFulfilled),
                take(FormDataActions.fetchFulfilled),
                take(FormDynamicsActions.fetchFulfilled),
                take(FormRulesActions.fetchFulfilled),
                take(FormLayoutActions.updateRepeatingGroupsFulfilled),
              ]);
              yield call(checkIfConditionalRulesShouldRunSaga, { type: '', payload: {} });
            }
          },
      }),
      fetch: mkAction<IFetchServiceConfigFulfilled | undefined>({
        takeLatest: fetchDynamicsSaga,
      }),
      fetchFulfilled: mkAction<IFetchServiceConfigFulfilled>({
        reducer: (state, action) => {
          state.apis = action.payload.apis;
          state.ruleConnection = action.payload.ruleConnection;
          state.conditionalRendering = action.payload.conditionalRendering;
          state.error = null;
        },
      }),
      fetchRejected: mkAction<IFetchServiceConfigRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
    },
  }));

  FormDynamicsActions = slice.actions;
  return slice;
};
