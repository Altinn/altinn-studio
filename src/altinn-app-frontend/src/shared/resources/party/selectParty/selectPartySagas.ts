import type { SagaIterator } from 'redux-saga';
import { call, takeLatest, put } from 'redux-saga/effects';
import type { IAltinnWindow } from 'src/types';
import { putWithoutConfig } from '../../../../utils/networking';
import { updateCookieUrl } from '../../../../utils/appUrlHelper';
import { PartyActions } from 'src/shared/resources/party/partySlice';
import type { ISelectParty } from 'src/shared/resources/party';
import type { PayloadAction } from '@reduxjs/toolkit';

function* selectPartySaga({
  payload: { party, redirect },
}: PayloadAction<ISelectParty>): SagaIterator {
  try {
    const url: string = updateCookieUrl(party.partyId);
    yield call(putWithoutConfig, url);
    yield put(PartyActions.selectPartyFulfilled({ party }));
    if (redirect) {
      const { org, app } = window as Window as IAltinnWindow;
      window.location.replace(`${window.location.origin}/${org}/${app}#/`);
    }
  } catch (error) {
    yield put(PartyActions.selectPartyRejected({ error }));
  }
}

export function* watchSelectPartySaga(): SagaIterator {
  yield takeLatest(PartyActions.selectParty, selectPartySaga);
}
