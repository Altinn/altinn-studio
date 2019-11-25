import { SagaIterator } from 'redux-saga';
import { call, put, select, takeLatest } from 'redux-saga/effects';

import { IParty } from '../../../../../../../shared/src/types';
import InstanceDataActions from '../../../../../shared/resources/instanceData/instanceDataActions';
import { IRuntimeState } from '../../../../../types';
import { convertDataBindingToModel } from '../../../../../utils/databindings';
import { post } from '../../../../../utils/networking';
import { getCreateDataElementUrl, getCreateInstancesUrl, getStartProcessUrl } from '../../../../../utils/urlHelper';
import InstantiationActions from '../../actions';
import * as InstantiationActionTypes from '../../actions/types';
import { IInstantiationState } from '../../reducer';

const InstantiatingSelector = ((state: IRuntimeState) => state.instantiation);
const SelectedPartySelector = ((state: IRuntimeState) => state.party.selectedParty);
const FormDataSelector = ((state: IRuntimeState) => state.formData.formData);
const DataModelSelector = ((state: IRuntimeState) => state.formDataModel.dataModel);

function* instantiationSaga(): SagaIterator {
  try {
    const instantitationState: IInstantiationState = yield select(InstantiatingSelector);
    if (!instantitationState.instantiating) {
      yield put(InstantiationActions.instantiateToggle());

      const selectedParty: IParty = yield select(SelectedPartySelector);

      // Creates a new instance
      const instanceResponse = yield call(post, getCreateInstancesUrl(selectedParty.partyId));
      const instanceId = instanceResponse.data.id;

      // Creates default data element
      const dataModel = yield select(DataModelSelector);
      const formData = yield select(FormDataSelector);
      const model = convertDataBindingToModel(formData, dataModel);
      yield call(
        post,
        getCreateDataElementUrl(instanceId, 'default'),
        {headers: {'Content-type': 'application/json'}},
        model,
      );

      // Start process
      yield call(post, getStartProcessUrl(instanceId));

      // Fetch new instance metadata
      const splitInstanceId = instanceId.split('/');
      yield call(InstanceDataActions.getInstanceData, splitInstanceId[0], splitInstanceId[1]);

      yield call (InstantiationActions.instantiateFulfilled, instanceId);
    }
  } catch (err) {
    yield call(InstantiationActions.instantiateRejected, err);
  }
}

export function * watchInstantiationSaga(): SagaIterator {
  yield takeLatest(InstantiationActionTypes.INSTANTIATE, instantiationSaga);
}
