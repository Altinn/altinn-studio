import { getCurrentPartySaga, getPartiesSaga } from 'src/shared/resources/party/getParties/getPartiesSagas';
import { selectPartySaga } from 'src/shared/resources/party/selectParty/selectPartySagas';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type {
  IGetPartiesFulfilled,
  IGetPartiesRejected,
  IPartyState,
  ISelectParty,
  ISelectPartyFulfilled,
  ISelectPartyRejected,
} from 'src/shared/resources/party';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

const initialState: IPartyState = {
  parties: null,
  selectedParty: null,
  error: null,
};

export const partySlice = createSagaSlice((mkAction: MkActionType<IPartyState>) => ({
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

export const PartyActions = partySlice.actions;
