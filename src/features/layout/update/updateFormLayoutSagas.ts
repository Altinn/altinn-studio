import { all, call, put, select, take } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/formData/formDataSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { staticUseLanguageFromState } from 'src/hooks/useLanguage';
import { Triggers } from 'src/layout/common.generated';
import { getLayoutOrderFromTracks, selectLayoutOrder } from 'src/selectors/getLayoutOrder';
import { getCurrentDataTypeForApplication, getCurrentTaskDataElementId, isStatelessApp } from 'src/utils/appMetadata';
import { convertDataBindingToModel } from 'src/utils/databindings';
import { getLayoutsetForDataElement } from 'src/utils/layout';
import { ResolvedNodesSelector } from 'src/utils/layout/hierarchy';
import { httpPost } from 'src/utils/network/networking';
import { httpGet } from 'src/utils/network/sharedNetworking';
import { waitFor } from 'src/utils/sagas';
import { getCalculatePageOrderUrl, getDataValidationUrl } from 'src/utils/urls/appUrlHelper';
import { mapValidationIssues } from 'src/utils/validation/backendValidation';
import {
  containsErrors,
  createValidationResult,
  filterValidationObjectsByPage,
  validationContextFromState,
} from 'src/utils/validation/validationHelpers';
import type { ICalculatePageOrderAndMoveToNextPage, IUpdateCurrentView } from 'src/features/layout/formLayoutTypes';
import type { IRuntimeState, IUiConfig } from 'src/types';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';
import type { BackendValidationIssue } from 'src/utils/validation/types';

export const selectFormLayoutState = (state: IRuntimeState) => state.formLayout;
export const selectFormData = (state: IRuntimeState) => state.formData.formData;
export const selectFormLayouts = (state: IRuntimeState) => state.formLayout.layouts;
export const selectAttachmentState = (state: IRuntimeState) => state.attachments;
export const selectAllLayouts = (state: IRuntimeState) => state.formLayout.uiConfig.tracks.order;
export const selectCurrentLayout = (state: IRuntimeState) => state.formLayout.uiConfig.currentView;
const selectUiConfig = (state: IRuntimeState) => state.formLayout.uiConfig;

export function* updateCurrentViewSaga({
  payload: {
    newView,
    runValidations,
    returnToView,
    skipPageCaching,
    keepScrollPos,
    focusComponentId,
    allowNavigationToHidden,
  },
}: PayloadAction<IUpdateCurrentView>): SagaIterator {
  try {
    const uiConfig: IUiConfig = yield select(selectUiConfig);

    // When triggering navigation we should save the data if autoSaveBehavior === 'onChangePage'
    // But we should not save the data when currentView is hidden.
    // This happens on the initial page load
    if (uiConfig.autoSaveBehavior === 'onChangePage') {
      const visibleLayouts: string[] | null = yield select(selectLayoutOrder);
      if (visibleLayouts?.includes(uiConfig.currentView)) {
        yield put(FormDataActions.saveLatest({}));
        yield take(FormDataActions.submitFulfilled);
      }
    } else {
      // When triggering navigation to the next page, we need to make sure there are no unsaved changes. The action to
      // save it should be triggered elsewhere, but we should wait until the state settles before navigating.
      yield waitFor((state) => !state.formData.unsavedChanges);
    }

    const state: IRuntimeState = yield select();
    const resolvedNodes: LayoutPages = yield select(ResolvedNodesSelector);
    const visibleLayouts: string[] | null = yield select(selectLayoutOrder);
    const viewCacheKey = state.formLayout.uiConfig.currentViewCacheKey;
    const instanceId = state.instanceData.instance?.id;
    if (!viewCacheKey) {
      yield put(FormLayoutActions.setCurrentViewCacheKey({ key: instanceId }));
    }
    const currentViewCacheKey = viewCacheKey || instanceId;

    if (visibleLayouts && !visibleLayouts.includes(newView) && allowNavigationToHidden !== true) {
      yield put(
        FormLayoutActions.updateCurrentViewRejected({
          error: null,
          keepScrollPos,
        }),
      );
      return;
    }

    if (runValidations === undefined) {
      if (!skipPageCaching && currentViewCacheKey) {
        localStorage.setItem(currentViewCacheKey, newView);
      }
      yield put(
        FormLayoutActions.updateCurrentViewFulfilled({
          newView,
          returnToView,
          focusComponentId,
        }),
      );
    } else {
      const currentView = state.formLayout.uiConfig.currentView;
      const frontendValidationObjects =
        resolvedNodes?.runValidations((node) => validationContextFromState(state, node)) ?? [];

      const options: AxiosRequestConfig = {
        headers: {
          LayoutId: currentView,
        },
      };
      const currentTaskDataId = getCurrentTaskDataElementId(
        state.applicationMetadata.applicationMetadata,
        state.instanceData.instance,
        state.formLayout.layoutsets,
      );

      const validationOptions = runValidations === Triggers.ValidatePage ? options : undefined;
      const serverValidations: BackendValidationIssue[] =
        instanceId && currentTaskDataId
          ? yield call(httpGet, getDataValidationUrl(instanceId, currentTaskDataId), validationOptions)
          : [];

      const serverValidationObjects = mapValidationIssues(
        serverValidations,
        resolvedNodes,
        staticUseLanguageFromState(state),
      );

      const validationObjects = filterValidationObjectsByPage(
        [...frontendValidationObjects, ...serverValidationObjects],
        runValidations,
        currentView,
        visibleLayouts ?? [],
      );

      const validationResult = createValidationResult(validationObjects);

      yield put(ValidationActions.updateValidations({ validationResult, merge: true }));

      /*
       * If only the current page or the previous pages are validated, this makes no difference.
       * If all pages are validated, we need to make sure that the current and previous pages are valid before allowing the user to
       * navigate to the next page; but if the error is on a future page, we should not prevent the user from navigating
       * to the next page.
       */
      const validationsToCheckBeforeNavigation = filterValidationObjectsByPage(
        validationObjects,
        Triggers.ValidateCurrentAndPreviousPages,
        currentView,
        visibleLayouts ?? [],
      );

      if (state.formLayout.uiConfig.returnToView || !containsErrors(validationsToCheckBeforeNavigation)) {
        if (!skipPageCaching && currentViewCacheKey) {
          localStorage.setItem(currentViewCacheKey, newView);
        }
        yield put(
          FormLayoutActions.updateCurrentViewFulfilled({
            newView,
            returnToView,
            focusComponentId,
          }),
        );
      } else {
        yield put(
          FormLayoutActions.updateCurrentViewRejected({
            error: null,
            keepScrollPos,
          }),
        );
      }
    }
  } catch (error) {
    yield put(FormLayoutActions.updateCurrentViewRejected({ error }));
    window.logError('Update view failed:\n', error);
  }
}

export function* calculatePageOrderAndMoveToNextPageSaga({
  payload: { runValidations, skipMoveToNext, keepScrollPos },
}: PayloadAction<ICalculatePageOrderAndMoveToNextPage>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const layoutSets = state.formLayout.layoutsets;
    const currentView = state.formLayout.uiConfig.currentView;
    const formData = convertDataBindingToModel(state.formData.formData);

    if (!state.applicationMetadata.applicationMetadata) {
      yield put(
        FormLayoutActions.calculatePageOrderAndMoveToNextPageRejected({
          error: null,
        }),
      );
      return;
    }

    let layoutSetId: string | null = null;
    const dataTypeId =
      getCurrentDataTypeForApplication({
        application: state.applicationMetadata.applicationMetadata,
        instance: state.instanceData.instance,
        layoutSets: state.formLayout.layoutsets,
      }) || null;

    const appIsStateless = isStatelessApp(state.applicationMetadata.applicationMetadata);
    if (appIsStateless) {
      layoutSetId = state.applicationMetadata.applicationMetadata.onEntry?.show || null;
    } else {
      const instance = state.instanceData.instance;
      if (layoutSets != null) {
        layoutSetId = getLayoutsetForDataElement(instance, dataTypeId || undefined, layoutSets) || null;
      }
    }
    const layoutOrderResponse: AxiosResponse = yield call(
      httpPost,
      getCalculatePageOrderUrl(appIsStateless),
      {
        params: {
          currentPage: currentView,
          layoutSetId,
          dataTypeId,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      },
      formData,
    );
    const layoutOrder = layoutOrderResponse.data ? layoutOrderResponse.data : null;
    yield put(
      FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({
        order: layoutOrder,
      }),
    );
    if (skipMoveToNext) {
      return;
    }
    const returnToView = state.formLayout.uiConfig.returnToView;
    const newOrder =
      getLayoutOrderFromTracks({
        ...state.formLayout.uiConfig.tracks,
        order: layoutOrder,
      }) || [];
    const newView = returnToView || newOrder[newOrder.indexOf(currentView) + 1];
    yield put(
      FormLayoutActions.updateCurrentView({
        newView,
        runValidations,
        keepScrollPos,
      }),
    );
  } catch (error) {
    if (error?.response?.status === 404) {
      // We accept that the app does noe have defined a calculate page order as this is not default for older apps
    } else {
      yield put(
        FormLayoutActions.calculatePageOrderAndMoveToNextPageRejected({
          error,
        }),
      );
    }
  }
}

/**
 * When hiding one or more pages, we cannot show them - so we'll have to make sure we navigate to the next one
 * in the page order (if currently on a page that is not visible).
 */
export function* findAndMoveToNextVisibleLayout(): SagaIterator {
  const allLayouts: string[] | null = yield select(selectAllLayouts);
  const visibleLayouts: string[] | null = yield select(selectLayoutOrder);
  const current: string = yield select(selectCurrentLayout);

  const possibleLayouts = new Set<string>(allLayouts || []);
  let nextVisiblePage = current;
  while (visibleLayouts && allLayouts && !visibleLayouts.includes(nextVisiblePage)) {
    const nextIndex = allLayouts.findIndex((l) => l === nextVisiblePage) + 1;
    nextVisiblePage = allLayouts[nextIndex];

    // Because findIndex() returns -1 when no item was found, the code above rolls around to index 0, and will
    // start looking at the first page again (which is intentional). However, if the state is broken we might
    // never find the visible layout, causing an infinite loop. This code just makes sure our ship is tight and
    // that loop can't happen.
    possibleLayouts.delete(nextVisiblePage);
    if (!possibleLayouts.size) {
      break;
    }
  }

  if (nextVisiblePage && nextVisiblePage !== current) {
    yield put(
      FormLayoutActions.updateCurrentViewFulfilled({
        newView: nextVisiblePage,
      }),
    );
  }
}

export function* watchInitialCalculatePageOrderAndMoveToNextPageSaga(): SagaIterator {
  while (true) {
    yield all([
      take(QueueActions.startInitialDataTaskQueue),
      take(FormLayoutActions.fetchFulfilled),
      take(FormLayoutActions.fetchSettingsFulfilled),
    ]);
    const state: IRuntimeState = yield select();
    const layouts = state.formLayout.layouts || {};
    const pageTriggers = state.formLayout.uiConfig.pageTriggers;
    const appHasCalculateTrigger =
      pageTriggers?.includes(Triggers.CalculatePageOrder) ||
      Object.keys(layouts).some(
        (layout) =>
          layouts[layout]?.some(
            (element) =>
              element.type === 'NavigationButtons' && element.triggers?.includes(Triggers.CalculatePageOrder),
          ),
      );
    if (appHasCalculateTrigger) {
      yield put(
        FormLayoutActions.calculatePageOrderAndMoveToNextPage({
          skipMoveToNext: true,
        }),
      );
    } else {
      yield put(FormLayoutActions.calculatePageOrderAndMoveToNextPageRejected({ error: null }));
    }
  }
}
