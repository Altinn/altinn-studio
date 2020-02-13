import { SagaIterator } from 'redux-saga';
import { call, put, select, takeLatest } from 'redux-saga/effects';
import { IParty } from 'altinn-shared/types';
import InstanceDataActions from '../../../../../shared/resources/instanceData/instanceDataActions';
import AttachmentActions from '../../../../../shared/resources/attachments/attachmentActions';
import { IRuntimeState } from '../../../../../types';
import { post } from '../../../../../utils/networking';
import { getCreateInstancesUrl, redirectToUpgrade } from '../../../../../utils/urlHelper';
import InstantiationActions from '../../actions';
import * as InstantiationActionTypes from '../../actions/types';
import { IInstantiationState } from '../../reducer';
import { AxiosResponse } from 'axios';

const InstantiatingSelector = ((state: IRuntimeState) => state.instantiation);
const SelectedPartySelector = ((state: IRuntimeState) => state.party.selectedParty);

function* instantiationSaga(): SagaIterator {
  try {
    const instantitationState: IInstantiationState = yield select(InstantiatingSelector);
    if (!instantitationState.instantiating) {
      yield put(InstantiationActions.instantiateToggle());

      const selectedParty: IParty = yield select(SelectedPartySelector);

      // Creates a new instance
      let instanceResponse: AxiosResponse;
      try {
        instanceResponse = yield call(post, getCreateInstancesUrl(selectedParty.partyId));
      } catch (error) {
        if (error.response && error.response.status === 403 && error.response.data) {
          const reqAuthLevel = error.response.data.RequiredAuthenticationLevel;
          if (reqAuthLevel) {
            yield call(redirectToUpgrade, reqAuthLevel);
          }
        }
      }

      yield call(InstanceDataActions.getInstanceDataFulfilled, instanceResponse.data);
      yield call(AttachmentActions.mapAttachments);
      yield call(InstantiationActions.instantiateFulfilled, instanceResponse.data.id);
    }
  } catch (err) {
    yield call(InstantiationActions.instantiateRejected, err);
  }
}

export function * watchInstantiationSaga(): SagaIterator {
  yield takeLatest(InstantiationActionTypes.INSTANTIATE, instantiationSaga);
}
