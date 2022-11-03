import { all, call, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { checkIfConditionalRulesShouldRunSaga } from 'src/features/form/dynamics/conditionalRendering/conditionalRenderingSagas';
import { fetchDynamicsSaga } from 'src/features/form/dynamics/fetch/fetchFormDynamicsSagas';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { FormRulesActions } from 'src/features/form/rules/rulesSlice';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type {
  ICheckIfConditionalRulesShouldRun,
  IFetchServiceConfigFulfilled,
  IFetchServiceConfigRejected,
  IFormDynamicState,
} from 'src/features/form/dynamics';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

const initialState: IFormDynamicState = {
  ruleConnection: {},
  conditionalRendering: {},
  apis: undefined,
  error: null,
};

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
            yield call(checkIfConditionalRulesShouldRunSaga);
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

export const FormDynamicsActions = slice.actions;
export default slice;
