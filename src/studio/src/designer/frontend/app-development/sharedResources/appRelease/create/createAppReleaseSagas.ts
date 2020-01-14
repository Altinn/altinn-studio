import { AxiosError } from 'axios';
import { delay, SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { checkIfAxiosError } from 'app-shared/utils/networking';
import { post } from '../../../utils/networking';
import { releasesUrlPost } from '../../../utils/urlHelper';
import * as AppReleaseActionTypes from '../appReleaseActionTypes';
import AppReleaseActionDispatcher from '../appReleaseDispatcher';
import { ICreateReleaseAction } from './createAppReleaseActions';

function* createReleaseSaga({
  tagName,
  name,
  body,
  targetCommitish,
}: ICreateReleaseAction): SagaIterator {
  try {
    const responseData: any = yield call(post, releasesUrlPost, {
      tagName,
      name,
      body,
      targetCommitish,
    });
    yield call(delay, 2000);
    yield call(AppReleaseActionDispatcher.createAppReleaseFulfilled, responseData);
  } catch (err) {
    if (checkIfAxiosError(err)) {
      const {response: {status}} = err as AxiosError;
      yield call(AppReleaseActionDispatcher.createAppReleaseRejected, status);
    }
  }
}

export function* watchCreateReleaseSaga(): SagaIterator {
  yield takeLatest(
    AppReleaseActionTypes.CREATE_APP_RELEASE,
    createReleaseSaga,
  );
}

export default function*(): SagaIterator {
  yield fork(watchCreateReleaseSaga);
}
