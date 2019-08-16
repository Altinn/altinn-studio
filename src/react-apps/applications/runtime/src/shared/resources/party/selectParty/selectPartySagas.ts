import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { IAltinnWindow } from 'src/types';
import { putWithoutConfig } from '../../../../utils/networking';
import { updateCookieUrl } from '../../../../utils/urlHelper';
import PartyActions from '../partyActions';
import { ISelectParty } from './selectPartyActions';
import * as SelectPartyActionTypes from './selectPartyActionTypes';

function* selectPartySaga({party, redirect}: ISelectParty): SagaIterator {
  try {
    const url: string = updateCookieUrl(party.partyId);
    console.log('selectPartySaga -> updating selected party with api call @ route ', url);
    yield call(putWithoutConfig, url);
    console.log('selectPartySaga -> put went without errors');
    yield call(PartyActions.selectPartyFulfilled, party);
    console.log('selectPartySaga -> action set party successfull');
    if (redirect) {
      const { org, service } = window as IAltinnWindow;
      console.log('selectPartySaga -> will redirect to', `${window.location.origin}/${org}/${service}#/`);
      window.location.replace(`${window.location.origin}/${org}/${service}#/`);
    }
  } catch (err) {
    yield call(PartyActions.selectPartyRejected, err);
  }
}

export function* watchSelectPartySaga(): SagaIterator {
  yield takeLatest(SelectPartyActionTypes.SELECT_PARTY, selectPartySaga);
}
