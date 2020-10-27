/* eslint-disable no-restricted-syntax */
import { SagaIterator } from 'redux-saga';
import { fork, take, call, select } from 'redux-saga/effects';
import { IRuntimeState } from 'src/types';
import { ILayouts } from 'src/features/form/layout';
import { IOption } from 'src/types';
import { get } from 'altinn-shared/utils';
import { getOptionsUrl } from '../../../../utils/urlHelper';
import * as formLayoutActionTypes from '../../../../features/form/layout/formLayoutActionTypes';
import * as fetchOptionActionTypes from './fetchOptionsActionTypes';
import OptionsActions from '../optionsActions';

const formLayoutSelector = (state: IRuntimeState): ILayouts => state.formLayout.layouts;

export function* fetchOptionsSaga(): SagaIterator {
  try {
    const layouts: ILayouts = yield select(formLayoutSelector);
    for (const layoutId of Object.keys(layouts)) {
      for (const element of layouts[layoutId]) {
        const component = element as any;
        if (component.optionsId) {
          yield fork(fetchSpecificOptionSaga, component.optionsId);
        }
      }
    }
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

export function* watchInitialFetchOptionSaga(): SagaIterator {
  yield take(formLayoutActionTypes.FETCH_FORM_LAYOUT_FULFILLED);
  yield call(OptionsActions.fetchOptions);
}

export function* watchFetchOptionsSaga(): SagaIterator {
  yield take(fetchOptionActionTypes.FETCH_OPTIONS);
  yield call(fetchOptionsSaga);
}
