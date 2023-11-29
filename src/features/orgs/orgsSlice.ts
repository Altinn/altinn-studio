import { createSagaSlice } from 'src/redux/sagaSlice';
import type { IFetchOrgsFulfilled, IOrgsState } from 'src/features/orgs/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IOrgsState = {
  allOrgs: null,
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
    },
  }));

  OrgsActions = slice.actions;
  return slice;
};
