import { SagaIterator } from 'redux-saga';
import { IProfile } from 'altinn-shared/types';
import { all, call, put, select, take } from 'redux-saga/effects';
import { get } from '../../../../utils/networking';
import { textResourcesUrl, oldTextResourcesUrl } from '../../../../utils/appUrlHelper';
import TextResourcesActions from '../textResourcesActions';
import { appTaskQueueError } from '../../queue/queueSlice';
import { FETCH_TEXT_RESOURCES } from './fetchTextResourcesActionTypes';
import { FETCH_PROFILE_FULFILLED } from '../../profile/fetch/fetchProfileActionTypes';
import { FETCH_APPLICATION_METADATA_FULFILLED } from 'src/shared/resources/applicationMetadata/actions/types';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { profileStateSelector } from 'src/selectors/simpleSelectors';

export const allowAnonymousSelector = makeGetAllowAnonymousSelector();
export function* fetchTextResources(): SagaIterator {
  try {
    let languageCode = 'nb'; // Use 'nb' as default until we decide how to handle default language
    const allowAnonymous = yield select(allowAnonymousSelector);
    if (!allowAnonymous) {
      const profile: IProfile = yield select(profileStateSelector);
      languageCode = profile.profileSettingPreference.language;
    }

    let resource: any;
    try {
      resource = yield call(get, textResourcesUrl(languageCode));
    } catch (error) {
      if (error.response.status !== 200) {
        resource = yield call(get, oldTextResourcesUrl);
      }
    }

    resource.resources.forEach((res) => {
      if (res.variables != null) {
        res.unparsedValue = res.value;
      }
    });
    yield call(TextResourcesActions.fetchTextResourcesFulfilled, resource.language, resource.resources);
  } catch (error) {
    yield call(TextResourcesActions.fetchTextResourcesRejected, error);
    yield put(appTaskQueueError({ error }));
  }
}

export function* watchFetchTextResourcesSaga(): SagaIterator {
  yield all([
    take(FormLayoutActions.fetchLayoutSetsFulfilled),
    take(FETCH_APPLICATION_METADATA_FULFILLED),
    take(FETCH_TEXT_RESOURCES)
  ]);

  const allowAnonymous = yield select(allowAnonymousSelector);

  if (!allowAnonymous) {
    yield take(FETCH_PROFILE_FULFILLED);
  }
  yield call(fetchTextResources);
}
