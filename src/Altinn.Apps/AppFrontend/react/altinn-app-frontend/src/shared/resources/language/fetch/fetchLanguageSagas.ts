import { SagaIterator } from 'redux-saga';
import { call, put, all, take, select } from 'redux-saga/effects';
// import { get } from '../../../../utils/networking';
import { IProfile } from 'altinn-shared/types';
import { getLanguageFromCode } from 'altinn-shared/language';
import LanguageActions from '../languageActions';
import * as LanguageActionTypes from './fetchLanguageActionTypes';
import * as ProfileActionTypes from '../../profile/fetch/fetchProfileActionTypes';
import { appTaskQueueError } from '../../queue/queueSlice';
import { IRuntimeState } from '../../../../types';

const profileState = (state: IRuntimeState): IProfile => state.profile.profile;

export function* fetchLanguageSaga(): SagaIterator {
  try {
    const profile: IProfile = yield select(profileState);
    const language = getLanguageFromCode(profile.profileSettingPreference.language);
    yield call(LanguageActions.fetchLanguageFulfilled, language);
  } catch (error) {
    yield call(LanguageActions.fetchLanguageRecjeted, error);
    yield put(appTaskQueueError({ error }));
  }
}

export function* watchFetchLanguageSaga(): SagaIterator {
  yield all([
    take(LanguageActionTypes.FETCH_LANGUAGE),
    take(ProfileActionTypes.FETCH_PROFILE_FULFILLED),
  ]);

  yield call(fetchLanguageSaga);
}
