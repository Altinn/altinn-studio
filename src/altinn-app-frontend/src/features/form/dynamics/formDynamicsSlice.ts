import type {
  IFormDynamicState,
  IFetchServiceConfigFulfilled,
  IFetchServiceConfigRejected,
  ICheckIfConditionalRulesShouldRun,
} from 'src/features/form/dynamics/index';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import { call, all, take } from 'redux-saga/effects';
import { fetchDynamicsSaga } from 'src/features/form/dynamics/fetch/fetchFormDynamicsSagas';
import { checkIfConditionalRulesShouldRunSaga } from 'src/features/form/dynamics/conditionalRendering/conditionalRenderingSagas';
import { FormRulesActions } from '../rules/rulesSlice';
import { FormDataActions } from '../data/formDataSlice';
import { FormLayoutActions } from '../layout/formLayoutSlice';
import type { SagaIterator } from 'redux-saga';

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
    checkIfConditionalRulesShouldRun:
      mkAction<ICheckIfConditionalRulesShouldRun>({
        takeLatest: checkIfConditionalRulesShouldRunSaga,
        saga: () =>
          function* (): SagaIterator {
            while (true) {
              yield all([
                take(FormLayoutActions.fetchFulfilled),
                take(FormDataActions.fetchFulfilled),
                take(FormDynamicsActions.fetchFulfilled),
                take(FormRulesActions.fetchFulfilled),
              ]);
              yield call(checkIfConditionalRulesShouldRunSaga);
            }
          },
      }),
    fetch: mkAction<IFetchServiceConfigFulfilled>({
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
