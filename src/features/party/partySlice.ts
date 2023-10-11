import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  IGetPartiesFulfilled,
  IGetPartiesRejected,
  IPartyState,
  ISelectPartyFulfilled,
  ISelectPartyRejected,
} from 'src/features/party/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IPartyState = {
  parties: null,
  selectedParty: null,
  autoRedirect: false,
  error: null,
};

export let PartyActions: ActionsFromSlice<typeof partySlice>;
export const partySlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IPartyState>) => ({
    name: 'party',
    initialState,
    actions: {
      getPartiesFulfilled: mkAction<IGetPartiesFulfilled>({
        reducer: (state, action) => {
          state.parties = action.payload.parties;
        },
      }),
      getPartiesRejected: mkAction<IGetPartiesRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
      selectPartyFulfilled: mkAction<ISelectPartyFulfilled>({
        reducer: (state, action) => {
          state.selectedParty = action.payload.party;
          state.autoRedirect = false;
        },
      }),
      selectPartyRejected: mkAction<ISelectPartyRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
      setAutoRedirect: mkAction<boolean>({
        reducer: (state, action) => {
          state.autoRedirect = action.payload;
        },
      }),
    },
  }));

  PartyActions = slice.actions;
  return slice;
};
