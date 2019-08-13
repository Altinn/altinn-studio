import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeState } from 'src/types';
import { IParty } from '../';
import { get } from '../../../../utils/networking';
import { partiesUrl } from '../../../../utils/urlHelper';
import PartyActions from '../partyActions';
import * as GetPartyActionTypes from './getPartiesActionTypes';

const SelectedPartySelector = ((state: IRuntimeState) => state.party.selectedParty);

function* getPartiesSaga(): SagaIterator {
  try {
    const parties: IParty[] = yield call(get, partiesUrl);

    const selectedParty = yield select(SelectedPartySelector);
    if (!selectedParty) {
      const altinnPartyId = document.cookie.split(';')
        .find((cookie: string) => cookie.indexOf('AltinnPartyId=') > -1)
        .split('=')[1];
      const activeParty = parties.find((party: IParty) => party.partyId.toString() === altinnPartyId);
      yield call(PartyActions.selectParty, activeParty, false);
    }

    yield call(PartyActions.getPartiesFulfilled, parties);
  } catch (err) {
    yield call(PartyActions.getPartiesRejected, err);
  }
}

export function* watchGetPartiesSaga(): SagaIterator {
  yield takeLatest(GetPartyActionTypes.GET_PARTIES, getPartiesSaga);
}
