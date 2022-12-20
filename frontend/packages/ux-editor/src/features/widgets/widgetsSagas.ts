import type { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchWidgetsSaga, watchFetchWidgetSettingsSaga } from './fetch/fetchWidgetsSagas';

export default function* widgetsSagas(): SagaIterator {
  yield fork(watchFetchWidgetsSaga);
  yield fork(watchFetchWidgetSettingsSaga);
}
