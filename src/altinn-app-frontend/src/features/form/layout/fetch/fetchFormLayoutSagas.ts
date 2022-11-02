import { all, call, put, select, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import components from 'src/components';
import {
  preProcessItem,
  preProcessLayout,
} from 'src/features/expressions/validation';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { getLayoutSetIdForApplication } from 'src/utils/appMetadata';
import {
  getLayoutSetsUrl,
  getLayoutSettingsUrl,
  getLayoutsUrl,
} from 'src/utils/appUrlHelper';
import { get } from 'src/utils/networking';
import type {
  ComponentTypes,
  ILayout,
  ILayouts,
} from 'src/features/form/layout';
import type { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import type {
  IHiddenLayoutsExpressions,
  ILayoutSets,
  ILayoutSettings,
  IRuntimeState,
} from 'src/types';

import type { IInstance } from 'altinn-shared/types';

export const layoutSetsSelector = (state: IRuntimeState) =>
  state.formLayout.layoutsets;
export const instanceSelector = (state: IRuntimeState) =>
  state.instanceData.instance;
export const applicationMetadataSelector = (state: IRuntimeState) =>
  state.applicationMetadata.applicationMetadata;

type ComponentTypeCaseMapping = { [key: string]: ComponentTypes };
let componentTypeCaseMapping: ComponentTypeCaseMapping | undefined = undefined;
function getCaseMapping(): ComponentTypeCaseMapping {
  if (!componentTypeCaseMapping) {
    componentTypeCaseMapping = {
      group: 'Group',
      summary: 'Summary',
    };

    for (const type in components) {
      componentTypeCaseMapping[type.toLowerCase()] = type as ComponentTypes;
    }
  }

  return componentTypeCaseMapping;
}

export function cleanLayout(layout: ILayout): ILayout {
  const mapping = getCaseMapping();
  const newLayout = layout.map((component) => ({
    ...component,
    type: mapping[component.type.toLowerCase()] || component.type,
  })) as ILayout;

  preProcessLayout(newLayout);

  return newLayout;
}

export function* fetchLayoutSaga(): SagaIterator {
  try {
    const layoutSets: ILayoutSets | null = yield select(layoutSetsSelector);
    const instance: IInstance | null = yield select(instanceSelector);
    const applicationMetadata: IApplicationMetadata = yield select(
      applicationMetadataSelector,
    );
    const layoutSetId = getLayoutSetIdForApplication(
      applicationMetadata,
      instance,
      layoutSets,
    );
    const layoutResponse: any = yield call(
      get,
      getLayoutsUrl(layoutSetId || null),
    );
    const layouts: ILayouts = {};
    const navigationConfig: any = {};
    const hiddenLayoutsExpressions: IHiddenLayoutsExpressions = {};
    let autoSave: boolean | undefined;
    let firstLayoutKey: string;
    if (layoutResponse.data?.layout) {
      layouts.FormLayout = layoutResponse.data.layout;
      hiddenLayoutsExpressions.FormLayout = layoutResponse.data.hidden;
      firstLayoutKey = 'FormLayout';
      autoSave = layoutResponse.data.autoSave;
    } else {
      const orderedLayoutKeys = Object.keys(layoutResponse).sort();

      // use instance id (or application id for stateless) as cache key for current page
      const currentViewCacheKey = instance?.id || applicationMetadata.id;
      yield put(
        FormLayoutActions.setCurrentViewCacheKey({ key: currentViewCacheKey }),
      );

      const lastVisitedPage = localStorage.getItem(currentViewCacheKey);
      if (lastVisitedPage && orderedLayoutKeys.includes(lastVisitedPage)) {
        firstLayoutKey = lastVisitedPage;
      } else {
        firstLayoutKey = orderedLayoutKeys[0];
      }

      orderedLayoutKeys.forEach((key) => {
        layouts[key] = cleanLayout(layoutResponse[key].data.layout);
        hiddenLayoutsExpressions[key] = layoutResponse[key].data.hidden;
        navigationConfig[key] = layoutResponse[key].data.navigation;
        autoSave = layoutResponse[key].data.autoSave;
      });
    }

    for (const key of Object.keys(hiddenLayoutsExpressions)) {
      hiddenLayoutsExpressions[key] = preProcessItem(
        hiddenLayoutsExpressions[key],
        { hidden: false },
        ['hidden'],
        key,
      );
    }

    yield put(
      FormLayoutActions.fetchFulfilled({
        layouts,
        navigationConfig,
        hiddenLayoutsExpressions,
      }),
    );
    yield put(FormLayoutActions.updateAutoSave({ autoSave }));
    yield put(
      FormLayoutActions.updateCurrentView({
        newView: firstLayoutKey,
        skipPageCaching: true,
      }),
    );
  } catch (error) {
    yield put(FormLayoutActions.fetchRejected({ error }));
    yield put(QueueActions.dataTaskQueueError({ error }));
  }
}

export function* watchFetchFormLayoutSaga(): SagaIterator {
  while (true) {
    yield all([
      take(FormLayoutActions.fetch),
      take(FormDataActions.fetchInitial),
      take(FormDataActions.fetchFulfilled),
    ]);
    yield call(fetchLayoutSaga);
  }
}

export function* fetchLayoutSettingsSaga(): SagaIterator {
  try {
    const layoutSets: ILayoutSets = yield select(layoutSetsSelector);
    const instance: IInstance = yield select(instanceSelector);
    const aplicationMetadataState: IApplicationMetadata = yield select(
      applicationMetadataSelector,
    );

    const layoutSetId = getLayoutSetIdForApplication(
      aplicationMetadataState,
      instance,
      layoutSets,
    );
    const settings: ILayoutSettings = yield call(
      get,
      getLayoutSettingsUrl(layoutSetId),
    );
    yield put(FormLayoutActions.fetchSettingsFulfilled({ settings }));
  } catch (error) {
    if (error?.response?.status === 404) {
      // We accept that the app does not have a settings.json as this is not default
      yield put(FormLayoutActions.fetchSettingsFulfilled({ settings: null }));
    } else {
      yield put(FormLayoutActions.fetchSettingsRejected({ error }));
    }
  }
}

export function* watchFetchFormLayoutSettingsSaga(): SagaIterator {
  while (true) {
    yield all([
      take(FormLayoutActions.fetchSettings),
      take(FormLayoutActions.fetchFulfilled),
    ]);
    yield call(fetchLayoutSettingsSaga);
  }
}

export function* fetchLayoutSetsSaga(): SagaIterator {
  try {
    const layoutSets: ILayoutSets = yield call(get, getLayoutSetsUrl());
    yield put(FormLayoutActions.fetchSetsFulfilled({ layoutSets }));
  } catch (error) {
    if (error?.response?.status === 404) {
      // We accept that the app does not have a layout sets as this is not default
      yield put(FormLayoutActions.fetchSetsFulfilled({ layoutSets: null }));
    } else {
      yield put(FormLayoutActions.fetchSetsRejected({ error }));
    }
  }
}
