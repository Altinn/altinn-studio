import { get } from 'app-shared/utils/networking';
import type { SagaIterator } from 'redux-saga';
import { all, call, put, select, take, takeLatest } from 'redux-saga/effects';
import {
  fetchWidgets,
  fetchWidgetsFulfilled,
  fetchWidgetsRejected,
  fetchWidgetSettings,
  fetchWidgetSettingsFulfilled,
  fetchWidgetSettingsRejected,
} from '../widgetsSlice';
import { widgetSettingsPath } from 'app-shared/api-paths';
import type { IAppState, IWidget } from '../../../types/global';
import { PayloadAction } from '@reduxjs/toolkit';

const widgetUrlsSelector = (state: IAppState) => state.widgets.urls;

export function* fetchWidgetsSaga(): SagaIterator {
  try {
    const urls = yield select(widgetUrlsSelector);
    const widgets: IWidget[] = [];
    for (const url of urls) {
      const widget = yield call(get, url);
      widgets.push(widget);
    }

    yield put(fetchWidgetsFulfilled({ widgets }));
  } catch (error) {
    yield put(fetchWidgetsRejected({ error }));
  }
}

export function* watchFetchWidgetsSaga(): SagaIterator {
  yield all([take(fetchWidgets.type), take(fetchWidgetSettingsFulfilled.type)]);
  yield call(fetchWidgetsSaga);
}

export function* fetchWidgetSettingsSaga({ payload }: PayloadAction<{org, app}>): SagaIterator {
  const { org, app } = payload;
  try {
    const url = widgetSettingsPath(org, app);
    const widgetSettings = yield call(get, url);
    yield put(
      fetchWidgetSettingsFulfilled({
        widgetUrls: widgetSettings?.widgetUrls || [],
      })
    );
  } catch (error) {
    yield put(fetchWidgetSettingsRejected({ error }));
  }
}

export function* watchFetchWidgetSettingsSaga(): SagaIterator {
  yield takeLatest(fetchWidgetSettings.type, fetchWidgetSettingsSaga);
}
