import { createSagaSlice } from 'src/redux/sagaSlice';
import type { IFetchOrgsFulfilled, IFetchOrgsRejected, IOrgsState } from 'src/features/orgs/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IOrgsState = {
  allOrgs: null,
  error: null,
};

export let OrgsActions: ActionsFromSlice<typeof orgsSlice>;
export const orgsSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IOrgsState>) => ({
    name: 'organisationMetaData',
    initialState,
    actions: {
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

  OrgsActions = slice.actions;
  return slice;
};
