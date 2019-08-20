import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeState } from 'src/types';
import { IParty } from '../';
import { get } from '../../../../utils/networking';
import { currentPartyUrl, partiesUrl } from '../../../../utils/urlHelper';
import PartyActions from '../partyActions';
import * as GetPartyActionTypes from './getPartiesActionTypes';

const SelectedPartySelector = ((state: IRuntimeState) => state.party.selectedParty);

function* getPartiesSaga(): SagaIterator {
  try {
    const parties: IParty[] = yield call(get, partiesUrl);
    const selectedParty = yield select(SelectedPartySelector);
    if (!selectedParty) {
      const selectedPartyId: string = yield call(get, currentPartyUrl);
      const activeParty: IParty = parties.find((party: IParty) => party.partyId === selectedPartyId);
      // We call the successfull action here because we don't want to update the
      // backend with the same party after selecting it
      yield call(PartyActions.selectPartyFulfilled, activeParty, false);
    }

    yield call(PartyActions.getPartiesFulfilled, parties);
  } catch (err) {
    yield call(PartyActions.getPartiesRejected, err);
  }
}

export function* watchGetPartiesSaga(): SagaIterator {
  yield takeLatest(GetPartyActionTypes.GET_PARTIES, getPartiesSaga);
}
