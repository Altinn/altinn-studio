import { AxiosError } from 'axios';
import { SagaIterator } from 'redux-saga';
import { delay } from 'redux-saga/effects';
import { call, fork, put, takeLatest } from 'redux-saga/effects';
import { checkIfAxiosError } from 'app-shared/utils/networking';
import { PayloadAction } from '@reduxjs/toolkit';
import { post } from '../../../utils/networking';
import { releasesPostUrl } from '../../../utils/urlHelper';
import { AppReleaseActions } from '../appReleaseSlice';
import { ICreateReleaseAction } from '../types';

function* createReleaseSaga({ payload: {
  tagName,
  name,
  body,
  targetCommitish,
} }: PayloadAction<ICreateReleaseAction>): SagaIterator {
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
      const { response: { status } } = error as AxiosError;
      yield put(AppReleaseActions.createAppReleasesRejected({ errorCode: status }));
    }
  }
}

export function* watchCreateReleaseSaga(): SagaIterator {
  yield takeLatest(AppReleaseActions.createAppRelease, createReleaseSaga);
}

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchCreateReleaseSaga);
}
