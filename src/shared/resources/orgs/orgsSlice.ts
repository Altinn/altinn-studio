import { fetchOrgsSaga } from 'src/shared/resources/orgs/fetch/fetchOrgsSagas';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type { IFetchOrgsFulfilled, IFetchOrgsRejected, IOrgsState } from 'src/shared/resources/orgs';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

const initialState: IOrgsState = {
  allOrgs: null,
  error: null,
};

const orgsSlice = createSagaSlice((mkAction: MkActionType<IOrgsState>) => ({
  name: 'organisationMetaData',
  initialState,
  actions: {
    fetch: mkAction<void>({
      takeLatest: fetchOrgsSaga,
    }),
    fetchFulfilled: mkAction<IFetchOrgsFulfilled>({
      reducer: (state, action) => {
        state.allOrgs = action.payload.orgs;
      },
    }),
    fetchRejected: mkAction<IFetchOrgsRejected>({
      reducer: (state, action) => {
        state.error = action.payload.error;
      },
    }),
  },
}));

export const OrgsActions = orgsSlice.actions;
export default orgsSlice;
