import { SagaIterator } from 'redux-saga';
import { call, all, take, select } from 'redux-saga/effects';
// import { get } from '../../../../utils/networking';
import { IProfile } from 'altinn-shared/types';
import { getLanguageFromCode } from '../languages';
import LanguageActions from '../languageActions';
import * as LanguageActionTypes from './fetchLanguageActionTypes';
import * as ProfileActionTypes from '../../profile/fetch/fetchProfileActionTypes';
import QueueActions from '../../queue/queueActions';
import { IRuntimeState } from '../../../../types';

const profileState = (state: IRuntimeState): IProfile => state.profile.profile;

export function* fetchLanguageSaga(): SagaIterator {
  try {
    const profile: IProfile = yield select(profileState);
    const language = getLanguageFromCode(profile.profileSettingPreference.language.toString());
    yield call(LanguageActions.fetchLanguageFulfilled, language);
  } catch (err) {
    yield call(LanguageActions.fetchLanguageRecjeted, err);
    yield call(QueueActions.appTaskQueueError, err);
  }
}

export function* watchFetchLanguageSaga(): SagaIterator {
  yield all([
    take(LanguageActionTypes.FETCH_LANGUAGE),
    take(ProfileActionTypes.FETCH_PROFILE_FULFILLED),
  ]);

  yield call(fetchLanguageSaga);
}
