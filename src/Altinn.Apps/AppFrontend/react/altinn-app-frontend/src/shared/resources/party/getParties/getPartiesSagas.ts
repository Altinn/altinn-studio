import { SagaIterator } from 'redux-saga';
import { call, put, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeState } from 'src/types';
import { IParty } from 'altinn-shared/types';
import { get } from '../../../../utils/networking';
import { currentPartyUrl, validPartiesUrl } from '../../../../utils/appUrlHelper';
import PartyActions from '../partyActions';
import * as GetPartyActionTypes from './getPartiesActionTypes';
import { appTaskQueueError } from '../../queue/queueSlice';

const PartiesSelector = ((state: IRuntimeState) => state.party.parties);

function* getPartiesSaga(): SagaIterator {
  try {
    const validParties: IParty[] = yield call(get, validPartiesUrl);
    yield call(PartyActions.getPartiesFulfilled, validParties);
  } catch (err) {
    yield call(PartyActions.getPartiesRejected, err);
  }
}

export function* watchGetPartiesSaga(): SagaIterator {
  yield takeLatest(GetPartyActionTypes.GET_PARTIES, getPartiesSaga);
}

function* getCurrentPartySaga(): SagaIterator {
  try {
    const currentParty: IParty = yield call(get, currentPartyUrl);
    yield call(PartyActions.selectPartyFulfilled, currentParty);
    const parties: IParty[] = yield select(PartiesSelector);

    if (!parties || parties.length === 0) {
      yield call(PartyActions.getPartiesFulfilled, [currentParty]);
    }
  } catch (error) {
    yield put(appTaskQueueError({ error }));
  }
}

export function* watchGetCurrentPartySaga(): SagaIterator {
  yield takeLatest(GetPartyActionTypes.GET_CURRENT_PARTY, getCurrentPartySaga);
}
