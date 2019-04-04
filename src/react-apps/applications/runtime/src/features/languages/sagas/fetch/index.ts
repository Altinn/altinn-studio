import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../utils/networking';
import LanguageActions from '../../actions';
import { IFetchLanguage } from '../../actions/fetch';
import * as LanguageActionTypes from '../../actions/types';

export function* fetchLanguageSaga({
  url,
  languageCode,
}: IFetchLanguage): SagaIterator {
  try {
    const language = yield call(get, url, { params: { languageCode } });
    yield call(LanguageActions.fetchLanguageFulfilled, language);
  } catch (err) {
    yield call(LanguageActions.fetchLanguageRecjeted, err);
  }
}

export function* watchFetchLanguageSaga(): SagaIterator {
  yield takeLatest(
    LanguageActionTypes.FETCH_LANGUAGE,
    fetchLanguageSaga,
  );
}
