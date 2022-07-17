import type { SagaIterator } from 'redux-saga';
import { call, put, select } from 'redux-saga/effects';
import type { IRuntimeState } from 'src/types';
import type { IParty } from 'altinn-shared/types';
import { get } from '../../../../utils/networking';
import {
  currentPartyUrl,
  validPartiesUrl,
} from '../../../../utils/appUrlHelper';
import { QueueActions } from '../../queue/queueSlice';
import { PartyActions } from 'src/shared/resources/party/partySlice';

const PartiesSelector = (state: IRuntimeState) => state.party.parties;

export function* getPartiesSaga(): SagaIterator {
  try {
    const parties: IParty[] = yield call(get, validPartiesUrl);
    yield put(PartyActions.getPartiesFulfilled({ parties }));
  } catch (error) {
    yield put(PartyActions.getPartiesRejected({ error }));
  }
}

export function* getCurrentPartySaga(): SagaIterator {
  try {
    const currentParty: IParty = yield call(get, currentPartyUrl);
    yield put(PartyActions.selectPartyFulfilled({ party: currentParty }));
    const parties: IParty[] = yield select(PartiesSelector);

    if (!parties || parties.length === 0) {
      yield put(PartyActions.getPartiesFulfilled({ parties: [currentParty] }));
    }
  } catch (error) {
    yield put(QueueActions.userTaskQueueError({ error }));
  }
}
