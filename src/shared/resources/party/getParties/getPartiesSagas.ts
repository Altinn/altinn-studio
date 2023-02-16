import { call, put, select } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { PartyActions } from 'src/shared/resources/party/partySlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { httpGet } from 'src/utils/network/networking';
import { currentPartyUrl, validPartiesUrl } from 'src/utils/urls/appUrlHelper';
import type { IRuntimeState } from 'src/types';
import type { IParty } from 'src/types/shared';

const PartiesSelector = (state: IRuntimeState) => state.party.parties;

export function* getPartiesSaga(): SagaIterator {
  try {
    const parties: IParty[] = yield call(httpGet, validPartiesUrl);
    yield put(PartyActions.getPartiesFulfilled({ parties }));
  } catch (error) {
    yield put(PartyActions.getPartiesRejected({ error }));
  }
}

export function* getCurrentPartySaga(): SagaIterator {
  try {
    const currentParty: IParty = yield call(httpGet, currentPartyUrl);
    yield put(PartyActions.selectPartyFulfilled({ party: currentParty }));
    const parties: IParty[] = yield select(PartiesSelector);

    if (!parties || parties.length === 0) {
      yield put(PartyActions.getPartiesFulfilled({ parties: [currentParty] }));
    }
  } catch (error) {
    yield put(QueueActions.userTaskQueueError({ error }));
  }
}
