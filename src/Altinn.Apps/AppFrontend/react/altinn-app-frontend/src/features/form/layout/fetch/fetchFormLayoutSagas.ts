import { SagaIterator } from 'redux-saga';
import { call, all, take, select, takeLatest } from 'redux-saga/effects';
import { IInstance } from 'altinn-shared/types';
import { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import { getLayoutSettingsUrl, getLayoutSetsUrl, getLayoutsUrl } from 'src/utils/urlHelper';
import { get } from '../../../../utils/networking';
import Actions from '../formLayoutActions';
import * as ActionTypes from '../formLayoutActionTypes';
import * as FormDataActionTypes from '../../data/formDataActionTypes';
import QueueActions from '../../../../shared/resources/queue/queueActions';
import { getRepeatingGroups } from '../../../../utils/formLayout';
import { ILayoutSettings, IRuntimeState, ILayoutSets } from '../../../../types';
import { IFormDataState } from '../../data/formDataReducer';
import { ILayouts } from '../index';
import { getLayouytsetForDataElement } from '../../../../utils/layout';
import { getDataTaskDataTypeId } from '../../../../utils/appMetadata';

const formDataSelector = (state: IRuntimeState) => state.formData;
const layoutSetsSelector = (state: IRuntimeState) => state.formLayout.layoutsets;
const instanceSelector = (state: IRuntimeState) => state.instanceData.instance;
const applicationMetadataSelector = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;

function* fetchFormLayoutSaga(): SagaIterator {
  try {
    const layoutSets: ILayoutSets = yield select(layoutSetsSelector);
    const instance: IInstance = yield select(instanceSelector);
    const formDataState: IFormDataState = yield select(formDataSelector);
    const aplicationMetadataState: IApplicationMetadata = yield select(applicationMetadataSelector);
    const dataType: string = getDataTaskDataTypeId(instance.process.currentTask.elementId,
      aplicationMetadataState.dataTypes);

    let layoutSetId: string = null;
    if (layoutSets != null) {
      layoutSetId = getLayouytsetForDataElement(instance, dataType, layoutSets);
    }
    const layoutResponse: any = yield call(get, getLayoutsUrl(layoutSetId));
    const layouts: ILayouts = {};
    const navigationConfig: any = {};
    let autoSave: boolean;
    let firstLayoutKey: string;
    let repeatingGroups = {};
    if (layoutResponse.data) {
      layouts.FormLayout = layoutResponse.data.layout;
      firstLayoutKey = 'FormLayout';
      autoSave = layoutResponse.data.autoSave;
      repeatingGroups = getRepeatingGroups(layouts[firstLayoutKey],
        formDataState.formData);
    } else {
      const orderedLayoutKeys = Object.keys(layoutResponse).sort();
      firstLayoutKey = orderedLayoutKeys[0];

      orderedLayoutKeys.forEach((key) => {
        layouts[key] = layoutResponse[key].data.layout;
        navigationConfig[key] = layoutResponse[key].data.navigation;
        autoSave = layoutResponse[key].data.autoSave;
        repeatingGroups = {
          ...repeatingGroups,
          ...getRepeatingGroups(layouts[key], formDataState.formData),
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
  while (true) {
    yield all([
      take(ActionTypes.FETCH_FORM_LAYOUT),
      take(FormDataActionTypes.FETCH_FORM_DATA_INITIAL),
      take(FormDataActionTypes.FETCH_FORM_DATA_FULFILLED),
      take(ActionTypes.FETCH_FORM_LAYOUTSETS_FULFILLED),
    ]);
    yield call(fetchFormLayoutSaga);
  }
}

export function* fetchFormLayoutSettingsSaga(): SagaIterator {
  try {
    const layoutSets: ILayoutSets = yield select(layoutSetsSelector);
    const instance: IInstance = yield select(instanceSelector);
    const aplicationMetadataState: IApplicationMetadata = yield select(applicationMetadataSelector);
    const dataType: string = getDataTaskDataTypeId(instance.process.currentTask.elementId,
      aplicationMetadataState.dataTypes);
    let layoutSetId: string = null;
    if (layoutSets != null) {
      layoutSetId = getLayouytsetForDataElement(instance, dataType, layoutSets);
    }
    const settings: ILayoutSettings = yield call(get, getLayoutSettingsUrl(layoutSetId));
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
  while (true) {
    yield all([
      take(ActionTypes.FETCH_FORM_LAYOUT_SETTINGS),
      take(ActionTypes.FETCH_FORM_LAYOUT_FULFILLED),
    ]);
    yield call(fetchFormLayoutSettingsSaga);
  }
}

export function* fetchFormLayoutSetsSaga(): SagaIterator {
  try {
    const layoutSets: ILayoutSets = yield call(get, getLayoutSetsUrl());
    yield call(Actions.fetchFormLayoutSetsFulfilled, layoutSets);
  } catch (error) {
    if (error?.response?.status === 404) {
      // We accept that the app does not have a layout sets as this is not default
      yield call(Actions.fetchFormLayoutSetsFulfilled, null);
    } else {
      yield call(Actions.fetchFormLayoutSetsRejected, error);
    }
  }
}

export function* watchFetchFormLayoutSetsSaga(): SagaIterator {
  yield takeLatest(ActionTypes.FETCH_FORM_LAYOUTSETS, fetchFormLayoutSetsSaga);
}
