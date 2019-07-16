import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { IParty } from '../';
import { get } from '../../../../utils/networking';
import PartyActions from '../partyActions';
import { IGetParties } from './getPartiesActions';
import * as GetPartyActionTypes from './getPartiesActionTypes';

function* getPartiesSaga({ url }: IGetParties): SagaIterator {
  try {
    const parties: IParty[] = yield call(get, url);
    yield call(PartyActions.getPartiesFulfilled, parties);
  } catch (err) {
    yield call(PartyActions.getPartiesRejected, err);
  }
}

export function* watchGetPartiesSaga(): SagaIterator {
  yield takeLatest(GetPartyActionTypes.GET_PARTIES, getPartiesSaga);
}
