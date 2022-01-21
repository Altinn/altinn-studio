import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { IAltinnWindow } from 'src/types';
import { putWithoutConfig } from '../../../../utils/networking';
import { updateCookieUrl } from '../../../../utils/appUrlHelper';
import PartyActions from '../partyActions';
import { ISelectParty } from './selectPartyActions';
import * as SelectPartyActionTypes from './selectPartyActionTypes';

function* selectPartySaga({ party, redirect }: ISelectParty): SagaIterator {
  try {
    const url: string = updateCookieUrl(party.partyId);
    yield call(putWithoutConfig, url);
    yield call(PartyActions.selectPartyFulfilled, party);
    if (redirect) {
      const { org, app } = window as Window as IAltinnWindow;
      window.location.replace(`${window.location.origin}/${org}/${app}#/`);
    }
  } catch (err) {
    yield call(PartyActions.selectPartyRejected, err);
  }
}

export function* watchSelectPartySaga(): SagaIterator {
  yield takeLatest(SelectPartyActionTypes.SELECT_PARTY, selectPartySaga);
}
