import { all, call, put, select, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { preProcessItem, preProcessLayout } from 'src/features/expressions/validation';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { ComponentConfigs } from 'src/layout/components.generated';
import { getLayoutSetIdForApplication } from 'src/utils/appMetadata';
import { httpGet } from 'src/utils/network/networking';
import { getLayoutSettingsUrl, getLayoutsUrl } from 'src/utils/urls/appUrlHelper';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { ExprObjConfig, ExprVal } from 'src/features/expressions/types';
import type { ILayoutFileExternal } from 'src/layout/common.generated';
import type { CompTypes, ILayout, ILayouts } from 'src/layout/layout';
import type { IHiddenLayoutsExternal, ILayoutSets, ILayoutSettings, IRuntimeState } from 'src/types';
import type { IInstance } from 'src/types/shared';

export const layoutSetsSelector = (state: IRuntimeState) => state.formLayout.layoutsets;
export const instanceSelector = (state: IRuntimeState) => state.instanceData.instance;
export const applicationMetadataSelector = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;

type ComponentTypeCaseMapping = { [key: string]: CompTypes };
let componentTypeCaseMapping: ComponentTypeCaseMapping | undefined = undefined;
function getCaseMapping(): ComponentTypeCaseMapping {
  if (!componentTypeCaseMapping) {
    componentTypeCaseMapping = {};
    for (const type in ComponentConfigs) {
      componentTypeCaseMapping[type.toLowerCase()] = type as CompTypes;
    }
  }

  return componentTypeCaseMapping;
}

export function cleanLayout(layout: ILayout, validateExpressions = true): ILayout {
  const mapping = getCaseMapping();
  const newLayout = layout.map((component) => ({
    ...component,
    type: mapping[component.type.toLowerCase()] || component.type,
  })) as ILayout;

  validateExpressions && preProcessLayout(newLayout);

  return newLayout;
}

export function* fetchLayoutSaga(): SagaIterator {
  try {
    const layoutSets: ILayoutSets | null = yield select(layoutSetsSelector);
    const instance: IInstance | null = yield select(instanceSelector);
    const applicationMetadata: IApplicationMetadata = yield select(applicationMetadataSelector);
    const layoutSetId = getLayoutSetIdForApplication(applicationMetadata, instance, layoutSets);
    const layoutResponse: ILayoutFileExternal | { [key: string]: ILayoutFileExternal } = yield call(
      httpGet,
      getLayoutsUrl(layoutSetId || null),
    );
    const layouts: ILayouts = {};
    const navigationConfig: any = {};
    const hiddenLayoutsExpressions: IHiddenLayoutsExternal = {};
    let firstLayoutKey: string;
    if ('data' in layoutResponse && 'layout' in layoutResponse.data && layoutResponse.data.layout) {
      layouts.FormLayout = layoutResponse.data.layout;
      hiddenLayoutsExpressions.FormLayout = layoutResponse.data.hidden;
      firstLayoutKey = 'FormLayout';
    } else {
      const orderedLayoutKeys = Object.keys(layoutResponse).sort();

      // use instance id (or application id for stateless) as cache key for current page
      const currentViewCacheKey = instance?.id || applicationMetadata.id;
      yield put(FormLayoutActions.setCurrentViewCacheKey({ key: currentViewCacheKey }));

      const lastVisitedPage = localStorage.getItem(currentViewCacheKey);
      if (lastVisitedPage && orderedLayoutKeys.includes(lastVisitedPage)) {
        firstLayoutKey = lastVisitedPage;
      } else {
        firstLayoutKey = orderedLayoutKeys[0];
      }

      orderedLayoutKeys.forEach((key) => {
        const file: ILayoutFileExternal = layoutResponse[key];
        layouts[key] = cleanLayout(file.data.layout);
        hiddenLayoutsExpressions[key] = file.data.hidden;
        navigationConfig[key] = file.data.navigation;
      });
    }

    const config: ExprObjConfig<{ hidden: ExprVal.Boolean; whatever: string }> = {
      hidden: {
        returnType: 'test',
        defaultValue: false,
        resolvePerRow: false,
      },
    };

    for (const key of Object.keys(hiddenLayoutsExpressions)) {
      hiddenLayoutsExpressions[key] = preProcessItem(hiddenLayoutsExpressions[key], config, ['hidden'], key);
    }

    yield put(
      FormLayoutActions.fetchFulfilled({
        layouts,
        navigationConfig,
        hiddenLayoutsExpressions,
        layoutSetId: layoutSetId ?? null,
      }),
    );
    yield put(
      FormLayoutActions.updateCurrentView({
        newView: firstLayoutKey,
        skipPageCaching: true,
      }),
    );
  } catch (error) {
    yield put(FormLayoutActions.fetchRejected({ error }));
    yield put(QueueActions.dataTaskQueueError({ error }));
    window.logError('Fetching form layout failed:\n', error);
  }
}

export function* watchFetchFormLayoutSaga(): SagaIterator {
  while (true) {
    yield all([take(FormLayoutActions.fetch), take(FormDataActions.fetchFulfilled)]);
    yield call(fetchLayoutSaga);
  }
}

export function* fetchLayoutSettingsSaga(): SagaIterator {
  try {
    const layoutSets: ILayoutSets = yield select(layoutSetsSelector);
    const instance: IInstance = yield select(instanceSelector);
    const aplicationMetadataState: IApplicationMetadata = yield select(applicationMetadataSelector);

    const layoutSetId = getLayoutSetIdForApplication(aplicationMetadataState, instance, layoutSets);
    const settings: ILayoutSettings = yield call(httpGet, getLayoutSettingsUrl(layoutSetId));
    yield put(FormLayoutActions.fetchSettingsFulfilled({ settings }));
  } catch (error) {
    if (error?.response?.status === 404) {
      // We accept that the app does not have a settings.json as this is not default
      yield put(FormLayoutActions.fetchSettingsFulfilled({ settings: null }));
    } else {
      yield put(FormLayoutActions.fetchSettingsRejected({ error }));
      window.logError('Fetching layout settings failed:\n', error);
    }
  }
}

export function* watchFetchFormLayoutSettingsSaga(): SagaIterator {
  while (true) {
    yield all([take(FormLayoutActions.fetchSettings), take(FormLayoutActions.fetchFulfilled)]);
    yield call(fetchLayoutSettingsSaga);
  }
}
