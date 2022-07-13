import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAction } from '@reduxjs/toolkit';
import type {
  IPartyState,
  IGetPartiesRejected,
  IGetPartiesFulfilled,
  ISelectPartyFulfilled,
  ISelectPartyRejected,
  ISelectParty,
} from '.';

const initialState: IPartyState = {
  parties: null,
  selectedParty: null,
  error: null,
};

const name = 'party';
const partySlice = createSlice({
  name,
  initialState,
  reducers: {
    getPartiesFulfilled: (
      state,
      action: PayloadAction<IGetPartiesFulfilled>,
    ) => {
      state.parties = action.payload.parties;
    },
    getPartiesRejected: (state, action: PayloadAction<IGetPartiesRejected>) => {
      state.error = action.payload.error;
    },
    selectPartyFulfilled: (
      state,
      action: PayloadAction<ISelectPartyFulfilled>,
    ) => {
      state.selectedParty = action.payload.party;
    },
    selectPartyRejected: (
      state,
      action: PayloadAction<ISelectPartyRejected>,
    ) => {
      state.error = action.payload.error;
    },
  },
});

const actions = {
  getParties: createAction(`${name}/getParties`),
  getCurrentParty: createAction(`${name}/getCurrentParty`),
  selectParty: createAction<ISelectParty>(`${name}/selectParty`),
};

export const PartyActions = {
  ...partySlice.actions,
  ...actions,
};
export default partySlice;
