import type { SagaIterator } from 'redux-saga';
import { call, put } from 'redux-saga/effects';
import { get, putWithoutConfig } from '../../../../utils/networking';
import {
  instancesControllerUrl,
  redirectToUpgrade,
  invalidateCookieUrl,
} from '../../../../utils/appUrlHelper';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { IGetInstanceData } from 'src/shared/resources/instanceData';

export function* getInstanceDataSaga({
  payload: { instanceOwner, instanceId },
}: PayloadAction<IGetInstanceData>): SagaIterator {
  try {
    const url = `${instancesControllerUrl}/${instanceOwner}/${instanceId}`;
    const result = yield call(get, url);
    yield put(InstanceDataActions.getFulfilled({ instanceData: result }));
  } catch (error) {
    if (
      error.response &&
      error.response.status === 403 &&
      error.response.data
    ) {
      const reqAuthLevel = error.response.data.RequiredAuthenticationLevel;
      if (reqAuthLevel) {
        putWithoutConfig(invalidateCookieUrl);
        yield call(redirectToUpgrade, reqAuthLevel);
      }
    } else {
      yield put(InstanceDataActions.getRejected({ error }));
    }
  }
}
