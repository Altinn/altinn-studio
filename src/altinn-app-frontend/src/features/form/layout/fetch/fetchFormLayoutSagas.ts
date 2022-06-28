import type { SagaIterator } from "redux-saga";
import { call, all, put, take, select, takeLatest } from "redux-saga/effects";
import type { IInstance } from "altinn-shared/types";
import type { IApplicationMetadata } from "src/shared/resources/applicationMetadata";
import {
  getLayoutSettingsUrl,
  getLayoutSetsUrl,
  getLayoutsUrl,
} from "src/utils/appUrlHelper";
import { get } from "../../../../utils/networking";
import { FormLayoutActions as Actions } from "../formLayoutSlice";
import FormDataActions from "../../data/formDataActions";
import { dataTaskQueueError } from "../../../../shared/resources/queue/queueSlice";
import type {
  ILayoutSettings,
  IRuntimeState,
  ILayoutSets,
} from "../../../../types";
import type { ILayouts } from "../index";
import { getLayoutSetIdForApplication } from "../../../../utils/appMetadata";

export const layoutSetsSelector = (state: IRuntimeState) =>
  state.formLayout.layoutsets;
export const instanceSelector = (state: IRuntimeState) =>
  state.instanceData.instance;
export const applicationMetadataSelector = (state: IRuntimeState) =>
  state.applicationMetadata.applicationMetadata;

export function* fetchLayoutSaga(): SagaIterator {
  try {
    const layoutSets: ILayoutSets = yield select(layoutSetsSelector);
    const instance: IInstance = yield select(instanceSelector);
    const applicationMetadata: IApplicationMetadata = yield select(
      applicationMetadataSelector
    );
    const layoutSetId = getLayoutSetIdForApplication(
      applicationMetadata,
      instance,
      layoutSets
    );
    const layoutResponse: any = yield call(get, getLayoutsUrl(layoutSetId));
    const layouts: ILayouts = {};
    const navigationConfig: any = {};
    let autoSave: boolean;
    let firstLayoutKey: string;
    if (layoutResponse.data?.layout) {
      layouts.FormLayout = layoutResponse.data.layout;
      firstLayoutKey = "FormLayout";
      autoSave = layoutResponse.data.autoSave;
    } else {
      const orderedLayoutKeys = Object.keys(layoutResponse).sort();

      // use instance id (or application id for stateless) as cache key for current page
      const currentViewCacheKey = instance?.id || applicationMetadata.id;
      yield put(Actions.setCurrentViewCacheKey({ key: currentViewCacheKey }));

      const lastVisitedPage = localStorage.getItem(currentViewCacheKey);
      if (lastVisitedPage && orderedLayoutKeys.includes(lastVisitedPage)) {
        firstLayoutKey = lastVisitedPage;
      } else {
        firstLayoutKey = orderedLayoutKeys[0];
      }

      orderedLayoutKeys.forEach((key) => {
        layouts[key] = layoutResponse[key].data.layout;
        navigationConfig[key] = layoutResponse[key].data.navigation;
        autoSave = layoutResponse[key].data.autoSave;
      });
    }

    yield put(Actions.fetchLayoutFulfilled({ layouts, navigationConfig }));
    yield put(Actions.updateAutoSave({ autoSave }));
    yield put(
      Actions.updateCurrentView({
        newView: firstLayoutKey,
        skipPageCaching: true,
      })
    );
  } catch (error) {
    yield put(Actions.fetchLayoutRejected({ error }));
    yield put(dataTaskQueueError({ error }));
  }
}

export function* watchFetchFormLayoutSaga(): SagaIterator {
  while (true) {
    yield all([
      take(Actions.fetchLayout),
      take(FormDataActions.fetchFormDataInitial),
      take(FormDataActions.fetchFormDataFulfilled),
      take(Actions.fetchLayoutSetsFulfilled),
    ]);
    yield call(fetchLayoutSaga);
  }
}

export function* fetchLayoutSettingsSaga(): SagaIterator {
  try {
    const layoutSets: ILayoutSets = yield select(layoutSetsSelector);
    const instance: IInstance = yield select(instanceSelector);
    const aplicationMetadataState: IApplicationMetadata = yield select(
      applicationMetadataSelector
    );

    const layoutSetId = getLayoutSetIdForApplication(
      aplicationMetadataState,
      instance,
      layoutSets
    );
    const settings: ILayoutSettings = yield call(
      get,
      getLayoutSettingsUrl(layoutSetId)
    );
    yield put(Actions.fetchLayoutSettingsFulfilled({ settings }));
  } catch (error) {
    if (error?.response?.status === 404) {
      // We accept that the app does not have a settings.json as this is not default
      yield put(Actions.fetchLayoutSettingsFulfilled({ settings: null }));
    } else {
      yield put(Actions.fetchLayoutSettingsRejected({ error }));
    }
  }
}

export function* watchFetchFormLayoutSettingsSaga(): SagaIterator {
  while (true) {
    yield all([
      take(Actions.fetchLayoutSettings),
      take(Actions.fetchLayoutFulfilled),
    ]);
    yield call(fetchLayoutSettingsSaga);
  }
}

export function* fetchLayoutSetsSaga(): SagaIterator {
  try {
    const layoutSets: ILayoutSets = yield call(get, getLayoutSetsUrl());
    yield put(Actions.fetchLayoutSetsFulfilled({ layoutSets }));
  } catch (error) {
    if (error?.response?.status === 404) {
      // We accept that the app does not have a layout sets as this is not default
      yield put(Actions.fetchLayoutSetsFulfilled({ layoutSets: null }));
    } else {
      yield put(Actions.fetchLayoutSetsRejected({ error }));
    }
  }
}

export function* watchFetchFormLayoutSetsSaga(): SagaIterator {
  yield takeLatest(Actions.fetchLayoutSets, fetchLayoutSetsSaga);
}
