import { SagaIterator } from 'redux-saga';
import { call, all, take, select, takeLatest } from 'redux-saga/effects';
import { IAltinnWindow } from 'altinn-shared/types';
import { getLayoutSettingsUrl } from 'src/utils/urlHelper';
import { get } from '../../../../utils/networking';
import Actions from '../formLayoutActions';
import { IFetchFormLayout } from './fetchFormLayoutActions';
import * as ActionTypes from '../formLayoutActionTypes';
import * as FormDataActionTypes from '../../data/formDataActionTypes';
import QueueActions from '../../../../shared/resources/queue/queueActions';
import { getRepeatingGroups } from '../../../../utils/formLayout';
import { ILayoutSettings, IRuntimeState } from '../../../../types';
import { IFormDataState } from '../../data/formDataReducer';
import { ILayoutComponent, ILayoutGroup, ILayouts } from '../index';

const formDataSelector = (state: IRuntimeState) => state.formData;

function* fetchFormLayoutSaga({ url }: IFetchFormLayout): SagaIterator {
  try {
    const layoutResponse: any = yield call(get, url);
    const layouts: ILayouts = {};
    const navigationConfig: any = {};
    let autoSave: boolean;
    let firstLayoutKey: string;
    let repeatingGroups = {};
    const formDataState: IFormDataState = yield select(formDataSelector);
    const layoutOrder: string[] = yield select((state: IRuntimeState) => state.formLayout.uiConfig.layoutOrder);

    if (layoutResponse.data) {
      layouts.FormLayout = layoutResponse.data.layout;
      firstLayoutKey = 'FormLayout';
      autoSave = layoutResponse.data.autoSave;
      repeatingGroups = getRepeatingGroups(layouts[firstLayoutKey] as [ILayoutComponent|ILayoutGroup],
        formDataState.formData);
    } else {
      // If there exist a defiend layoutout order in settings.json we use that, otherwise we sort alphabetically
      const orderedLayoutKeys = layoutOrder || Object.keys(layoutResponse).sort();
      firstLayoutKey = orderedLayoutKeys[0];

      orderedLayoutKeys.forEach((key) => {
        layouts[key] = layoutResponse[key].data.layout;
        navigationConfig[key] = layoutResponse[key].data.navigation;
        autoSave = layoutResponse[key].data.autoSave;
        repeatingGroups = {
          ...repeatingGroups,
          ...getRepeatingGroups(layouts[key] as [ILayoutComponent|ILayoutGroup], formDataState.formData),
        };
      });
    }

    yield call(Actions.fetchFormLayoutFulfilled, layouts, navigationConfig);
    yield call(Actions.updateAutoSave, autoSave);
    yield call(Actions.updateRepeatingGroupsFulfilled, repeatingGroups);
    yield call(Actions.updateCurrentView, firstLayoutKey);
  } catch (err) {
    yield call(Actions.fetchFormLayoutRejected, err);
    yield call(QueueActions.dataTaskQueueError, err);
  }
}

export function* watchFetchFormLayoutSaga(): SagaIterator {
  yield all([
    take(ActionTypes.FETCH_FORM_LAYOUT),
    take(FormDataActionTypes.FETCH_FORM_DATA_INITIAL),
    take(FormDataActionTypes.FETCH_FORM_DATA_FULFILLED),
    take(ActionTypes.FETCH_FORM_LAYOUT_SETTINGS_FULFILLED),
  ]);
  const { org, app } = window as Window as IAltinnWindow;
  const url = `${window.location.origin}/${org}/${app}/api/resource/FormLayout.json`;
  yield call(fetchFormLayoutSaga, { url } as IFetchFormLayout);
}

export function* fetchFormLayoutSettingsSaga(): SagaIterator {
  try {
    const settings: ILayoutSettings = yield call(get, getLayoutSettingsUrl());
    yield call(Actions.fetchFormLayoutSettingsFulfilled, settings);
  } catch (error) {
    if (error?.response?.status === 404) {
      // We accept that the app does not have a settings.json as this is not default
      yield call(Actions.fetchFormLayoutSettingsFulfilled, null);
    } else {
      yield call(Actions.fetchFormLayoutSettingsRejected, error);
    }
  }
}

export function* watchFetchFormLayoutSettingsSaga(): SagaIterator {
  yield takeLatest(ActionTypes.FETCH_FORM_LAYOUT_SETTINGS, fetchFormLayoutSettingsSaga);
}
