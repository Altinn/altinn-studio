import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeState } from 'src/types';
import { IParty } from 'altinn-shared/types';
import { get } from '../../../../utils/networking';
import { findSelectedParty } from '../../../../utils/partyUtils';
import { allPartiesUrl, currentPartyUrl, validPartiesUrl } from '../../../../utils/urlHelper';
import PartyActions from '../partyActions';
import * as GetPartyActionTypes from './getPartiesActionTypes';

const SelectedPartySelector = ((state: IRuntimeState) => state.party.selectedParty);

function* getPartiesSaga(): SagaIterator {
  try {
    const validParties: IParty[] = yield call(get, validPartiesUrl);
    const selectedParty = yield select(SelectedPartySelector);
    if (!selectedParty) {
      const selectedPartyId: string = yield call(get, currentPartyUrl);
      const allParties: IParty[] = yield call(get, allPartiesUrl);
      const activeParty: IParty = findSelectedParty(allParties, selectedPartyId);
      // We call the successfull action here because we don't want to update the
      // backend with the same party after selecting it
      yield call(PartyActions.selectPartyFulfilled, activeParty, false);
    }

    yield call(PartyActions.getPartiesFulfilled, validParties);
  } catch (err) {
    yield call(PartyActions.getPartiesRejected, err);
  }
}

export function* watchGetPartiesSaga(): SagaIterator {
  yield takeLatest(GetPartyActionTypes.GET_PARTIES, getPartiesSaga);
}
