import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import PartyActions from '../partyActions';
import { ISelectParty } from './selectPartyActions';
import * as SelectPartyActionTypes from './selectPartyActionTypes';

function* selectPartySaga({party}: ISelectParty): SagaIterator {
  try {
    yield call(PartyActions.selectPartyFulfilled, party);
  } catch (err) {
    yield call(PartyActions.selectPartyRejected, err);
  }
}

export function* watchSelectPartySaga(): SagaIterator {
  yield takeLatest(SelectPartyActionTypes.SELECT_PARTY, selectPartySaga);
}
