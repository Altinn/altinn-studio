import type { AxiosError } from 'axios';
import type { SagaIterator } from 'redux-saga';
import { call, delay, put, takeLatest } from 'redux-saga/effects';
import { checkIfAxiosError, post } from 'app-shared/utils/networking';
import type { PayloadAction } from '@reduxjs/toolkit';
import { releasesPostUrl } from '../../../utils/urlHelper';
import { AppReleaseActions } from '../appReleaseSlice';
import type { ICreateReleaseAction } from '../types';

function* createReleaseSaga({
  payload: { tagName, name, body, targetCommitish },
}: PayloadAction<ICreateReleaseAction>): SagaIterator {
  try {
    const responseData: any = yield call(post, releasesPostUrl, {
      tagName,
      name,
      body,
      targetCommitish,
    });
    yield delay(2000);
    yield put(AppReleaseActions.createAppReleasesFulfilled({ release: responseData }));
  } catch (error) {
    if (checkIfAxiosError(error)) {
      const {
        response: { status },
      } = error as AxiosError;
      yield put(AppReleaseActions.createAppReleasesRejected({ errorCode: status }));
    }
  }
}

export function* watchCreateReleaseSaga(): SagaIterator {
  yield takeLatest(AppReleaseActions.createAppRelease, createReleaseSaga);
}
