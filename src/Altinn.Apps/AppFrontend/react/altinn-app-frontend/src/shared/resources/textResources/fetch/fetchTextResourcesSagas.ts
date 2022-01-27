import { SagaIterator } from 'redux-saga';
import { IProfile } from 'altinn-shared/types';
import { all, call, put, select, take } from 'redux-saga/effects';
import { get } from '../../../../utils/networking';
import { textResourcesUrl, oldTextResourcesUrl } from '../../../../utils/appUrlHelper';
import TextResourcesActions from '../textResourcesActions';
import { appTaskQueueError } from '../../queue/queueSlice';
import { FETCH_TEXT_RESOURCES } from './fetchTextResourcesActionTypes';
import { IRuntimeState } from '../../../../types';
import { FETCH_PROFILE_FULFILLED } from '../../profile/fetch/fetchProfileActionTypes';

const profileState = (state: IRuntimeState): IProfile => state.profile.profile;

function* fetchTextResources(): SagaIterator {
  try {
    const profile: IProfile = yield select(profileState);
    let resource: any;
    try {
      resource = yield call(get, textResourcesUrl(profile.profileSettingPreference.language));
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
    take(FETCH_PROFILE_FULFILLED),
    take(FETCH_TEXT_RESOURCES),
  ]);
  yield call(fetchTextResources);
}
