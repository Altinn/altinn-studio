import { SagaIterator } from 'redux-saga';
import { call, put, select, takeLatest } from 'redux-saga/effects';

import { IParty } from '../../../../../shared/resources/party';
import { IRuntimeState } from '../../../../../types';
import { post } from '../../../../../utils/networking';
import { instantiateUrl } from '../../../../../utils/urlHelper';
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
      const response = yield call(post, instantiateUrl, null, formData);

      if (response.data.instanceId) {
        yield put(InstantiationActions.instantiateFulfilled(response.data.instanceId));
        window.location.replace(`${window.location.origin}/${org}/${service}#/error`);
      } else {
        throw new Error('Server did not respond with new instance');
      }
    }
  } catch (err) {
    yield call(InstantiationActions.instantiateRejected, err);
    window.location.replace(`${window.location.origin}/${org}/${service}#/error`);
  }
}

export function * watchInstantiationSaga(): SagaIterator {
  yield takeLatest(InstantiationActionTypes.INSTANTIATE, instantiationSaga);
}
