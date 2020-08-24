import { SagaIterator } from 'redux-saga';
import { IProfile } from 'altinn-shared/types';
import { all, call, select, take } from 'redux-saga/effects';
import { get } from '../../../../utils/networking';
import { textResourcesUrl, oldTextResourcesUrl } from '../../../../utils/urlHelper';
import TextResourcesActions from '../textResourcesActions';
import QueueActions from '../../queue/queueActions';
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
  } catch (err) {
    yield call(TextResourcesActions.fetchTextResourcesRejected, err);
    yield call(QueueActions.appTaskQueueError, err);
  }
}

export function* watchFetchTextResourcesSaga(): SagaIterator {
  yield all([
    take(FETCH_PROFILE_FULFILLED),
    take(FETCH_TEXT_RESOURCES),
  ]);
  yield call(fetchTextResources);
}
