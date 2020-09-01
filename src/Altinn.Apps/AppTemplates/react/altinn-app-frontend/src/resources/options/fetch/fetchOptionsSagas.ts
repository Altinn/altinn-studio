/* eslint-disable no-restricted-syntax */
import { SagaIterator } from 'redux-saga';
import { fork, call, takeLatest } from 'redux-saga/effects';
import { get } from 'altinn-shared/utils';
import { IOption } from 'src/types';
import { getOptionsUrl } from '../../../utils/urlHelper';
import * as fetchOptionActionTypes from './fetchOptionsActionTypes';
import OptionsActions from '../optionsActions';
import { IFetchOptionsAction } from './fetchOptionsActions';

export function* fetchOptionsSaga({ optionsId }: IFetchOptionsAction): SagaIterator {
  try {
    yield fork(fetchSpecificOptionSaga, optionsId);
  } catch (error) {
    yield call(OptionsActions.fetchOptionsRejected, error);
  }
}

export function* fetchSpecificOptionSaga(optionsId: string): SagaIterator {
  try {
    const options: IOption[] = yield call(get, getOptionsUrl(optionsId));
    yield call(OptionsActions.fetchOptionsFulfilled, optionsId, options);
  } catch (error) {
    yield call(OptionsActions.fetchOptionsRejected, error);
  }
}

export function* watchFetchOptionsSaga(): SagaIterator {
  yield takeLatest(fetchOptionActionTypes.FETCH_OPTIONS, fetchOptionsSaga);
}
