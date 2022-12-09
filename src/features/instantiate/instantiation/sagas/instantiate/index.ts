import { call, put, select } from 'redux-saga/effects';
import type { AxiosResponse } from 'axios';
import type { SagaIterator } from 'redux-saga';

import { InstantiationActions } from 'src/features/instantiate/instantiation/instantiationSlice';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import { getCreateInstancesUrl, invalidateCookieUrl, redirectToUpgrade } from 'src/utils/urls/appUrlHelper';
import { post, putWithoutConfig } from 'src/utils/network/networking';
import type { IRuntimeState } from 'src/types';

import type { IParty } from 'src/types/shared';

const SelectedPartySelector = (state: IRuntimeState) => state.party.selectedParty;

export function* instantiationSaga(): SagaIterator {
  try {
    const selectedParty: IParty = yield select(SelectedPartySelector);

    // Creates a new instance
    let instanceResponse: AxiosResponse;
    try {
      instanceResponse = yield call(post, getCreateInstancesUrl(selectedParty.partyId));
    } catch (error) {
      if (error.response && error.response.status === 403 && error.response.data) {
        const reqAuthLevel = error.response.data.RequiredAuthenticationLevel;
        if (reqAuthLevel) {
          yield call(putWithoutConfig, invalidateCookieUrl);
          yield call(redirectToUpgrade, reqAuthLevel);
        }
      }
      throw error;
    }

    yield put(
      InstanceDataActions.getFulfilled({
        instanceData: instanceResponse.data,
      }),
    );
    yield put(
      InstantiationActions.instantiateFulfilled({
        instanceId: instanceResponse.data.id,
      }),
    );
  } catch (error) {
    yield put(InstantiationActions.instantiateRejected({ error }));
  }
}
