import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
// import { get } from '../../../../utils/networking';
import { nb } from '../languages';
import LanguageActions from './../languageActions';
import { IFetchLanguage } from './fetchLanguageActions';
import * as LanguageActionTypes from './fetchLanguageActionTypes';
import QueueActions from '../../queue/queueActions';

export function* fetchLanguageSaga({
  url,
  languageCode,
}: IFetchLanguage): SagaIterator {
  try {
    // const language = yield call(get, url, { params: { languageCode } });
    yield call(LanguageActions.fetchLanguageFulfilled, nb());
  } catch (err) {
    yield call(LanguageActions.fetchLanguageRecjeted, err);
    yield call(QueueActions.appTaskQueueError, err);
  }
}

export function* watchFetchLanguageSaga(): SagaIterator {
  yield takeLatest(
    LanguageActionTypes.FETCH_LANGUAGE,
    fetchLanguageSaga,
  );
}
