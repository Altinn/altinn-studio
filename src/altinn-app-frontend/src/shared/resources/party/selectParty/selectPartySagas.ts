import { call, put } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { PartyActions } from 'src/shared/resources/party/partySlice';
import { updateCookieUrl } from 'src/utils/appUrlHelper';
import { putWithoutConfig } from 'src/utils/networking';
import type { ISelectParty } from 'src/shared/resources/party';
import type { IAltinnWindow } from 'src/types';

export function* selectPartySaga({
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
