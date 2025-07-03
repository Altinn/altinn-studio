import { useCallback, useEffect, useMemo } from 'react';
import type { NavigateOptions } from 'react-router-dom';

import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useSetReturnToView, useSetSummaryNodeOfOrigin } from 'src/features/form/layout/PageNavigationContext';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { usePageSettings, useRawPageOrder } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useGetTaskTypeById, useProcessQuery } from 'src/features/instance/useProcessQuery';
import {
  SearchParams,
  useAllNavigationParamsAsRef,
  useNavigate as useCtxNavigate,
  useNavigationParam,
  useNavigationParams,
  useQueryKeysAsString,
  useQueryKeysAsStringAsRef,
  useSetNavigationEffect,
} from 'src/features/routing/AppRoutingContext';
import { useRefetchInitialValidations } from 'src/features/validation/backendValidation/backendValidationQuery';
import { useAsRef } from 'src/hooks/useAsRef';
import { useLocalStorageState } from 'src/hooks/useLocalStorageState';
import { ProcessTaskType } from 'src/types';
import { behavesLikeDataTask } from 'src/utils/formLayout';
import { Hidden, NodesInternal } from 'src/utils/layout/NodesContext';
import type { NavigationEffectCb } from 'src/features/routing/AppRoutingContext';

export interface NavigateToPageOptions {
  replace?: boolean;
  skipAutoSave?: boolean;
  shouldFocusComponent?: boolean;
  resetReturnToView?: boolean;
  exitSubform?: boolean;
  focusComponentId?: string;
}

export enum TaskKeys {
  ProcessEnd = 'ProcessEnd',
  CustomReceipt = 'CustomReceipt',
}

/**
 * Navigation function for react-router-dom
 * Makes sure to clear returnToView and summaryNodeOfOrigin on navigation
 * Takes an optional callback
 */
const useNavigate = () => {
  const storeCallback = useSetNavigationEffect();
  const setReturnToView = useSetReturnToView();
  const setSummaryNodeOfOrigin = useSetSummaryNodeOfOrigin();
  const navigate = useCtxNavigate();

  return useCallback(
    (path: string, ourOptions?: NavigateToPageOptions, theirOptions?: NavigateOptions, cb?: NavigationEffectCb) => {
      const resetReturnToView = ourOptions?.resetReturnToView ?? true;
      if (resetReturnToView) {
        setReturnToView?.(undefined);
        setSummaryNodeOfOrigin?.(undefined);
      }
      if (cb) {
        storeCallback(cb);
      }
      navigate(path, theirOptions);
    },
    [setReturnToView, storeCallback, setSummaryNodeOfOrigin, navigate],
  );
};

export const useCurrentView = () => useNavigationParam('pageKey');
export const usePageOrder = () => {
  const rawOrder = useRawPageOrder();
  const hiddenPages = Hidden.useHiddenPages();
  return useMemo(() => rawOrder.filter((page) => !hiddenPages.has(page)), [rawOrder, hiddenPages]);
};

export const useIsCurrentTask = () => {
  const currentTaskId = useProcessQuery().data?.currentTask?.elementId;
  const taskId = useNavigationParam('taskId');
  return useMemo(() => {
    if (currentTaskId === undefined && taskId === TaskKeys.CustomReceipt) {
      return true;
    }
    return currentTaskId === taskId;
  }, [currentTaskId, taskId]);
};

function getPreviousPageKey(order: string[], currentPageId: string | undefined) {
  if (currentPageId === undefined) {
    return undefined;
  }
  const currentPageIndex = order.indexOf(currentPageId);
  const previousPageIndex = currentPageIndex !== -1 ? currentPageIndex - 1 : undefined;
  if (previousPageIndex === undefined || previousPageIndex < 0) {
    return undefined;
  }

  return order[previousPageIndex];
}

function getNextPageKey(order: string[], currentPageId: string | undefined) {
  if (currentPageId === undefined) {
    return undefined;
  }
  const currentPageIndex = order.indexOf(currentPageId);
  const nextPageIndex = currentPageIndex !== -1 ? currentPageIndex + 1 : undefined;
  if (nextPageIndex === undefined || nextPageIndex >= order.length) {
    return undefined;
  }

  return order[nextPageIndex];
}

export const usePreviousPageKey = () => getPreviousPageKey(usePageOrder(), useNavigationParam('pageKey'));
export const useNextPageKey = () => getNextPageKey(usePageOrder(), useNavigationParam('pageKey'));

export const useStartUrl = (forcedTaskId?: string) => {
  const queryKeys = useQueryKeysAsString();
  const order = usePageOrder();
  // This needs up to date params, so using the native hook that re-renders often
  // However, this hook is only used in cases where we immediately navigate to a different path
  // so it does not make a difference here.
  const { instanceOwnerPartyId, instanceGuid, taskId, mainPageKey, componentId, dataElementId } = useNavigationParams();
  const isSubformPage = !!mainPageKey;
  const taskType = useGetTaskTypeById()(taskId);
  const isStateless = useApplicationMetadata().isStatelessApp;

  return useMemo(() => {
    const firstPage = order?.[0];
    if (isStateless && firstPage) {
      return `/${firstPage}${queryKeys}`;
    }
    if (typeof forcedTaskId === 'string') {
      return `/instance/${instanceOwnerPartyId}/${instanceGuid}/${forcedTaskId}${queryKeys}`;
    }
    if (taskType === ProcessTaskType.Archived) {
      return `/instance/${instanceOwnerPartyId}/${instanceGuid}/${TaskKeys.ProcessEnd}${queryKeys}`;
    }
    if (taskType !== ProcessTaskType.Data && taskId !== undefined) {
      return `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}${queryKeys}`;
    }
    if (isSubformPage && taskId && mainPageKey && componentId && dataElementId && firstPage) {
      return `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}/${mainPageKey}/${componentId}/${dataElementId}/${firstPage}${queryKeys}`;
    }
    if (taskId && firstPage) {
      return `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}/${firstPage}${queryKeys}`;
    }
    if (taskId) {
      return `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}${queryKeys}`;
    }
    return `/instance/${instanceOwnerPartyId}/${instanceGuid}${queryKeys}`;
  }, [
    componentId,
    dataElementId,
    forcedTaskId,
    instanceGuid,
    isStateless,
    isSubformPage,
    mainPageKey,
    order,
    instanceOwnerPartyId,
    queryKeys,
    taskId,
    taskType,
  ]);
};

export function useNavigateToTask() {
  const navigate = useNavigate();
  const navParams = useAllNavigationParamsAsRef();
  const queryKeysRef = useQueryKeysAsStringAsRef();
  const layoutSets = useLayoutSets();

  return useCallback(
    (newTaskId: string, options?: NavigateOptions & { runEffect?: boolean }) => {
      const { runEffect = true } = options ?? {};
      const { instanceOwnerPartyId, instanceGuid, taskId } = navParams.current;
      if (newTaskId === taskId) {
        return;
      }
      let realTaskId = newTaskId;
      if (newTaskId === TaskKeys.ProcessEnd || newTaskId === TaskKeys.CustomReceipt) {
        // Go to the correct receipt, no matter what we're actually given
        realTaskId = behavesLikeDataTask(TaskKeys.CustomReceipt, layoutSets)
          ? TaskKeys.CustomReceipt
          : TaskKeys.ProcessEnd;
      }
      const url = `/instance/${instanceOwnerPartyId}/${instanceGuid}/${realTaskId}${queryKeysRef.current}`;
      navigate(url, undefined, options, runEffect ? () => focusMainContent(options) : undefined);
    },
    [navParams, navigate, queryKeysRef, layoutSets],
  );
}

export function useIsValidTaskId() {
  const processTasks = useProcessQuery().data?.processTasks;

  return useCallback(
    (taskId?: string) => {
      if (!taskId) {
        return false;
      }
      if (taskId === TaskKeys.ProcessEnd) {
        return true;
      }
      if (taskId === TaskKeys.CustomReceipt) {
        return true;
      }
      return processTasks?.find((task) => task.elementId === taskId) !== undefined;
    },
    [processTasks],
  );
}

export function useNavigatePage() {
  const isStatelessApp = useApplicationMetadata().isStatelessApp;
  const navigate = useNavigate();
  const navParams = useAllNavigationParamsAsRef();
  const queryKeysRef = useQueryKeysAsStringAsRef();
  const getTaskType = useGetTaskTypeById();
  const refetchInitialValidations = useRefetchInitialValidations();

  const { autoSaveBehavior } = usePageSettings();
  const order = usePageOrder();
  const orderRef = useAsRef(order);

  const isValidPageId = useCallback(
    (_pageId: string) => {
      // The page ID may be URL encoded already, if we got this from react-router.
      const pageId = decodeURIComponent(_pageId);
      if (getTaskType(navParams.current.taskId) !== ProcessTaskType.Data) {
        return false;
      }
      return orderRef.current.includes(pageId) ?? false;
    },
    [getTaskType, navParams, orderRef],
  );

  /**
   * For stateless apps, this is how we redirect to the
   * initial page of the app. We replace the url, to not
   * have the initial page (i.e. the page without a
   * pageKey) in the history.
   */
  useEffect(() => {
    const currentPageId = navParams.current.pageKey ?? '';
    if (isStatelessApp && orderRef.current[0] !== undefined && (!currentPageId || !isValidPageId(currentPageId))) {
      navigate(`/${orderRef.current[0]}${queryKeysRef.current}`, { replace: true });
    }
  }, [isStatelessApp, orderRef, navigate, isValidPageId, navParams, queryKeysRef]);

  const waitForSave = FD.useWaitForSave();
  const waitForNodesReady = NodesInternal.useWaitUntilReady();
  const maybeSaveOnPageChange = useCallback(async () => {
    await waitForSave(autoSaveBehavior === 'onChangePage');
    await waitForNodesReady();
  }, [autoSaveBehavior, waitForSave, waitForNodesReady]);

  const navigateToPage = useCallback(
    async (page?: string, options?: NavigateToPageOptions) => {
      const replace = options?.replace ?? false;
      if (!page) {
        window.logWarn('navigateToPage called without page');
        return;
      }
      if (!orderRef.current.includes(page) && options?.exitSubform !== true) {
        window.logWarn('navigateToPage called with invalid page:', `"${page}"`);
        return;
      }

      if (options?.skipAutoSave !== true) {
        await maybeSaveOnPageChange();
      }
      if (options?.exitSubform) {
        await refetchInitialValidations();
      }

      if (isStatelessApp) {
        return navigate(`/${page}${queryKeysRef.current}`, options, { replace }, () => focusMainContent(options));
      }

      const { instanceOwnerPartyId, instanceGuid, taskId, mainPageKey, componentId, dataElementId } = navParams.current;

      // Subform
      if (mainPageKey && componentId && dataElementId && options?.exitSubform !== true) {
        const url = `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}/${mainPageKey}/${componentId}/${dataElementId}/${page}${queryKeysRef.current}`;
        return navigate(url, options, { replace }, () => focusMainContent(options));
      }

      let url = `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}/${page}`;

      const searchParams = new URLSearchParams(queryKeysRef.current);

      // Special cases for component focus and subform exit
      if (options?.focusComponentId || options?.exitSubform) {
        if (options?.focusComponentId) {
          searchParams.set(SearchParams.FocusComponentId, options.focusComponentId);
        }

        if (options?.exitSubform) {
          searchParams.set(SearchParams.ExitSubform, 'true');
        }
      }

      url = `${url}?${searchParams.toString()}`;
      navigate(url, options, { replace }, () => focusMainContent(options));
    },
    [isStatelessApp, maybeSaveOnPageChange, navParams, navigate, orderRef, queryKeysRef, refetchInitialValidations],
  );

  const [_, setVisitedPages] = useVisitedPages();
  /**
   * This function fetch the next page index on function
   * invocation and then navigates to the next page. This is
   * to be able to chain multiple ClientActions together.
   */
  const navigateToNextPage = useCallback(
    async (options?: NavigateToPageOptions) => {
      const currentPage = navParams.current.pageKey;
      const nextPage = getNextPageKey(orderRef.current, currentPage);
      if (!nextPage) {
        window.logWarn('Tried to navigate to next page when standing on the last page.');
        return;
      }

      setVisitedPages((prev) => {
        const visitedPages = [...prev];
        if (currentPage && !prev.includes(currentPage)) {
          visitedPages.push(currentPage);
        }
        if (!prev.includes(nextPage)) {
          visitedPages.push(nextPage);
        }
        return visitedPages;
      });

      await navigateToPage(nextPage, options);
    },
    [navParams, navigateToPage, orderRef, setVisitedPages],
  );

  /**
   * This function fetches the previous page index on
   * function invocation and then navigates to the previous
   * page. This is to be able to chain multiple ClientActions
   * together.
   */
  const navigateToPreviousPage = useCallback(
    async (options?: NavigateToPageOptions) => {
      const previousPage = getPreviousPageKey(orderRef.current, navParams.current.pageKey);

      if (!previousPage) {
        window.logWarn('Tried to navigate to previous page when standing on the first page.');
        return;
      }
      await navigateToPage(previousPage, options);
    },
    [navParams, navigateToPage, orderRef],
  );

  const exitSubform = async () => {
    if (!navParams.current.mainPageKey) {
      window.logWarn('Tried to close subform page while not in a subform.');
      return;
    }

    await navigateToPage(navParams.current.mainPageKey, {
      exitSubform: true,
      resetReturnToView: false,
      focusComponentId: navParams.current.componentId,
    });
  };

  const enterSubform = async ({
    nodeId,
    dataElementId,
    page,
    validate,
  }: {
    nodeId: string;
    dataElementId: string;
    page?: string;
    validate?: boolean;
  }) => {
    if (page && !orderRef.current.includes(page)) {
      window.logWarn('enterSubform called with invalid page:', `"${page}"`);
      return;
    }
    const { instanceOwnerPartyId, instanceGuid, taskId, pageKey } = navParams.current;
    const url = `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}/${page ?? pageKey}/${nodeId}/${dataElementId}${validate ? '?validate=true' : ''}`;

    await maybeSaveOnPageChange();
    refetchInitialValidations();
    return navigate(url, undefined, undefined, () => focusMainContent());
  };

  return {
    navigateToPage,
    isValidPageId,
    order,
    navigateToNextPage,
    navigateToPreviousPage,
    maybeSaveOnPageChange,
    exitSubform,
    enterSubform,
  };
}

export function focusMainContent(options?: NavigateToPageOptions) {
  if (options?.shouldFocusComponent !== true) {
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }
}

export function useVisitedPages() {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  const taskId = useNavigationParam('taskId');
  const componentId = useNavigationParam('componentId');
  const dataElementId = useNavigationParam('dataElementId');

  return useLocalStorageState(
    ['visitedPages', instanceOwnerPartyId, instanceGuid, taskId, componentId, dataElementId],
    emptyArray,
  );
}
const emptyArray = [];
