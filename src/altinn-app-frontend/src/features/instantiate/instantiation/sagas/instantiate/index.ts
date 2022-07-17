import type { SagaIterator } from 'redux-saga';
import { call, put, select } from 'redux-saga/effects';
import type { IParty } from 'altinn-shared/types';
import type { AxiosResponse } from 'axios';
import type { IRuntimeState } from '../../../../../types';
import { post, putWithoutConfig } from '../../../../../utils/networking';
import {
  getCreateInstancesUrl,
  redirectToUpgrade,
  invalidateCookieUrl,
} from '../../../../../utils/appUrlHelper';
import { InstantiationActions } from 'src/features/instantiate/instantiation/instantiationSlice';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';

const SelectedPartySelector = (state: IRuntimeState) =>
  state.party.selectedParty;

export function* instantiationSaga(): SagaIterator {
  try {
    const selectedParty: IParty = yield select(SelectedPartySelector);

    // Creates a new instance
    let instanceResponse: AxiosResponse;
    try {
      instanceResponse = yield call(
        post,
        getCreateInstancesUrl(selectedParty.partyId),
      );
    } catch (error) {
      if (
        error.response &&
        error.response.status === 403 &&
        error.response.data
      ) {
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
