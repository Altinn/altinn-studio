import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeState } from '../../../../types';
import { get } from '../../../../utils/networking';
import { IParty } from '../../party';
import PartyActions from '../../party/partyActions';
import ProfileActions from '../profileActions';
import { IFetchProfile } from './fetchProfileActions';
import * as ProfileActionTypes from './fetchProfileActionTypes';

const SelectedParty = ((state: IRuntimeState) => state.party.selectedParty);

function* fetchProfileSaga({ url }: IFetchProfile): SagaIterator {
  try {
    const profile = yield call(get, url);
    yield call(
      ProfileActions.fetchProfileFulfilled,
      profile,
    );
    const selectedParty: IParty = yield select(SelectedParty);
    if (!selectedParty) {
      PartyActions.selectParty(profile.party);
    }
  } catch (err) {
    yield call(ProfileActions.fetchProfileRejected, err);
  }
}

export function* watchFetchProfileSaga(): SagaIterator {
  yield takeLatest(ProfileActionTypes.FETCH_PROFILE, fetchProfileSaga);
}
