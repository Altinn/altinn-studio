import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../utils/networking';
import InstanceDataActions from './../instanceDataActions';
import * as getInstanceDataActions from './getInstanceDataActions';
import * as InstanceDataActionTypes from './getInstanceDataActionTypes';

import { instancesControllerUrl } from './../../../../utils/urlHelper';

export function* getInstanceDataSaga({
  instanceOwner,
  instanceId,
}: getInstanceDataActions.IGetInstanceData ): SagaIterator {
  try {
    const url = `${instancesControllerUrl}/${instanceOwner}/${instanceId}`;
    const result = yield call(get, url);
    yield call(InstanceDataActions.getInstanceDataFulfilled, result);
  } catch (err) {
    yield call(InstanceDataActions.getInstanceDataRejected, err);
  }
}

export function* watchGetInstanceDataSaga(): SagaIterator {
  yield takeLatest(
    InstanceDataActionTypes.GET_INSTANCEDATA,
    getInstanceDataSaga,
  );
}
