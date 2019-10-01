import { AxiosError, AxiosResponse } from 'axios';
import { SagaIterator } from 'redux-saga';
import { call, put, select, takeLatest } from 'redux-saga/effects';

import { IParty } from '../../../../../shared/resources/party';
import { IRuntimeState } from '../../../../../types';
import { post } from '../../../../../utils/networking';
import { instantiateUrl, reactErrorPage } from '../../../../../utils/urlHelper';
import InstantiationActions from '../../actions';
import { IInstantiate } from '../../actions/instantiate';
import * as InstantiationActionTypes from '../../actions/types';
import { IInstantiationState } from '../../reducer';

const InstantiatingSelector = ((state: IRuntimeState) => state.instantiation);
const SelectedPartySelector = ((state: IRuntimeState) => state.party.selectedParty);

function* instantiationSaga({
  org,
  service,
}: IInstantiate): SagaIterator {
  try {
    const instantitationState: IInstantiationState = yield select(InstantiatingSelector);
    if (!instantitationState.instantiating) {
      yield put(InstantiationActions.instantiateToggle());

      const selectedParty: IParty = yield select(SelectedPartySelector);
      const formData = new FormData();

      formData.append('PartyId', selectedParty.partyId);
      formData.append('Org', org);
      formData.append('Service', service);
      post(instantiateUrl, null, formData)
        .then((response: AxiosResponse) => {
          if (response.data.instanceId !== null) {
            InstantiationActions.instantiateFulfilled(response.data.instanceId);
          }
        }).catch((response: AxiosError) => {
          if (response.response.status === 500) {
            window.location.href = reactErrorPage;
          } else {
            InstantiationActions.instantiateRejected(response);
          }
        });
    }
  } catch (err) {
    yield call(InstantiationActions.instantiateRejected, err);
  }
}

export function * watchInstantiationSaga(): SagaIterator {
  yield takeLatest(InstantiationActionTypes.INSTANTIATE, instantiationSaga);
}
