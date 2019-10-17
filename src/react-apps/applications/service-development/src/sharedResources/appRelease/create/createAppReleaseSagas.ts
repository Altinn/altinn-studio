import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
// import { post } from '../../../utils/networking';
// import { releasesUrl } from '../../../utils/urlHelper';
import * as AppReleaseActionTypes from '../appReleaseActionTypes';
import AppReleaseActionDispatcher from '../appReleaseDispatcher';
import { ICreateReleaseAction } from './createAppReleaseActions';
import { IRelease, BuildResult, BuildStatus } from '../types';

function* createReleaseSaga({
  tagName,
  name,
  body,
  targetCommitish,
}: ICreateReleaseAction): SagaIterator {
  try {
    // const responseData: any = yield call(post, releasesUrl, {
    //   tagName,
    //   name,
    //   body,
    //   targetCommitish,
    // });
    const { org, app } = window as Window as IAltinnWindow;
    console.log('targetCommitish in saga', targetCommitish);
    const mockResponse: IRelease = {
      tagName,
      name,
      body,
      targetCommitish,
      build: {
        id: '17304',
        status: 'notStarted' as BuildStatus.notStarted,
        result: 'none' as BuildResult.none,
        started: null,
        finished: null,
      },
      id: '1c4af940-5ed6-47e1-970d-b488696f9f5e',
      created: '2019-10-17T14:38:39.7677667+02:00',
      createdBy: 'danrj',
      app,
      org,
     };
    yield call(AppReleaseActionDispatcher.createAppReleaseFulfilled, mockResponse);
  } catch (err) {
    yield call(AppReleaseActionDispatcher.createAppReleaseRejected, err);
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
