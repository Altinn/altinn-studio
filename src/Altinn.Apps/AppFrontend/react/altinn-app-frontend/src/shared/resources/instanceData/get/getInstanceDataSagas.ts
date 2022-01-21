import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get, putWithoutConfig } from '../../../../utils/networking';
import { instancesControllerUrl, redirectToUpgrade, invalidateCookieUrl } from '../../../../utils/appUrlHelper';
import AttachmentActions from '../../attachments/attachmentActions';
import InstanceDataActions from '../instanceDataActions';
import * as getInstanceDataActions from './getInstanceDataActions';
import * as InstanceDataActionTypes from './getInstanceDataActionTypes';

export function* getInstanceDataSaga({
  instanceOwner,
  instanceId,
}: getInstanceDataActions.IGetInstanceData): SagaIterator {
  try {
    const url = `${instancesControllerUrl}/${instanceOwner}/${instanceId}`;
    const result = yield call(get, url);
    yield call(InstanceDataActions.getInstanceDataFulfilled, result);
    yield call(AttachmentActions.mapAttachments);
  } catch (error) {
    if (error.response && error.response.status === 403 && error.response.data) {
      const reqAuthLevel = error.response.data.RequiredAuthenticationLevel;
      if (reqAuthLevel) {
        putWithoutConfig(invalidateCookieUrl);
        yield call(redirectToUpgrade, reqAuthLevel);
      }
    } else {
      yield call(InstanceDataActions.getInstanceDataRejected, error);
    }
  }
}

export function* watchGetInstanceDataSaga(): SagaIterator {
  yield takeLatest(
    InstanceDataActionTypes.GET_INSTANCEDATA,
    getInstanceDataSaga,
  );
}
