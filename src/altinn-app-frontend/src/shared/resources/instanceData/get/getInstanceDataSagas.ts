import { call, put } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import {
  instancesControllerUrl,
  invalidateCookieUrl,
  redirectToUpgrade,
} from 'src/utils/appUrlHelper';
import { get, putWithoutConfig } from 'src/utils/networking';
import type { IGetInstanceData } from 'src/shared/resources/instanceData';

export function* getInstanceDataSaga({
  payload: { instanceId },
}: PayloadAction<IGetInstanceData>): SagaIterator {
  try {
    const url = `${instancesControllerUrl}/${instanceId}`;
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
