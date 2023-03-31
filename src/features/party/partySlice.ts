import { getCurrentPartySaga, getPartiesSaga } from 'src/features/party/getPartiesSagas';
import { selectPartySaga } from 'src/features/party/selectPartySagas';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  IGetPartiesFulfilled,
  IGetPartiesRejected,
  IPartyState,
  ISelectParty,
  ISelectPartyFulfilled,
  ISelectPartyRejected,
} from 'src/features/party/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IPartyState = {
  parties: null,
  selectedParty: null,
  error: null,
};

export let PartyActions: ActionsFromSlice<typeof partySlice>;
export const partySlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IPartyState>) => ({
    name: 'party',
    initialState,
    actions: {
      getParties: mkAction<void>({
        takeLatest: getPartiesSaga,
      }),
      getCurrentParty: mkAction<void>({
        takeLatest: getCurrentPartySaga,
      }),
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
      selectParty: mkAction<ISelectParty>({
        takeLatest: selectPartySaga,
      }),
      selectPartyFulfilled: mkAction<ISelectPartyFulfilled>({
        reducer: (state, action) => {
          state.selectedParty = action.payload.party;
        },
      }),
      selectPartyRejected: mkAction<ISelectPartyRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
    },
  }));

  PartyActions = slice.actions;
  return slice;
};
