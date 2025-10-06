import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { NavigateOptions } from 'react-router-dom';

import { SearchParams } from 'src/core/routing/types';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useSetReturnToView, useSetSummaryNodeOfOrigin } from 'src/features/form/layout/PageNavigationContext';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { usePageSettings, useRawPageOrder } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useGetTaskTypeById, useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useSetNavigationEffect } from 'src/features/navigation/NavigationEffectContext';
import { useRefetchInitialValidations } from 'src/features/validation/backendValidation/backendValidationQuery';
import { useAllNavigationParams, useAllNavigationParamsAsRef, useNavigationParam } from 'src/hooks/navigation';
import { useAsRef } from 'src/hooks/useAsRef';
import { useLocalStorageState } from 'src/hooks/useLocalStorageState';
import { ProcessTaskType } from 'src/types';
import { behavesLikeDataTask } from 'src/utils/formLayout';
import { useHiddenPages } from 'src/utils/layout/hidden';
import type { NavigationEffect } from 'src/features/navigation/NavigationEffectContext';
import type { NodeRefValidation } from 'src/features/validation';

export interface NavigateToPageOptions {
  replace?: boolean;
  skipAutoSave?: boolean;
  resetReturnToView?: boolean;
  searchParams?: URLSearchParams;
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

const useOurNavigate = () => {
  const storeCallback = useSetNavigationEffect();
  const setReturnToView = useSetReturnToView();
  const setSummaryNodeOfOrigin = useSetSummaryNodeOfOrigin();
  const navigate = useNavigate();

  return useCallback(
    (path: string, ourOptions?: NavigateToPageOptions, theirOptions?: NavigateOptions, effect?: NavigationEffect) => {
      const resetReturnToView = ourOptions?.resetReturnToView ?? true;
      if (resetReturnToView) {
        setReturnToView?.(undefined);
        setSummaryNodeOfOrigin?.(undefined);
      }
      if (effect) {
        storeCallback(effect);
      }
      navigate(path, theirOptions);
    },
    [navigate, setReturnToView, setSummaryNodeOfOrigin, storeCallback],
  );
};

export const useCurrentView = () => useNavigationParam('pageKey');
export const usePageOrder = () => {
  const rawOrder = useRawPageOrder();
  const hiddenPages = useHiddenPages();
  return useMemo(() => rawOrder.filter((page) => !hiddenPages.has(page)), [rawOrder, hiddenPages]);
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
  const queryKeys = useLocation().search;
  const order = usePageOrder();
  // This needs up to date params, so using the native hook that re-renders often
  // However, this hook is only used in cases where we immediately navigate to a different path
  // so it does not make a difference here.
  const { instanceOwnerPartyId, instanceGuid, taskId, mainPageKey, componentId, dataElementId } =
    useAllNavigationParams();
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
  const navigate = useOurNavigate();
  const navParams = useAllNavigationParamsAsRef();
  const queryKeysRef = useAsRef(useLocation().search);
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
      navigate(
        url,
        undefined,
        options,
        runEffect ? { callback: () => focusMainContent(options), targetLocation: url, matchStart: true } : undefined,
      );
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
  const navigate = useOurNavigate();
  const navParams = useAllNavigationParamsAsRef();
  const getTaskType = useGetTaskTypeById();
  const refetchInitialValidations = useRefetchInitialValidations();
  const [_searchParams] = useSearchParams();
  const searchParamsRef = useAsRef(_searchParams);

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
      navigate(`/${orderRef.current[0]}?${searchParamsRef.current}`, { replace: true });
    }
  }, [isStatelessApp, orderRef, navigate, isValidPageId, navParams, searchParamsRef]);

  const waitForSave = FD.useWaitForSave();
  const maybeSaveOnPageChange = useCallback(async () => {
    await waitForSave(autoSaveBehavior === 'onChangePage');
  }, [autoSaveBehavior, waitForSave]);

  const navigateToPage = useCallback(
    async (page?: string, options?: NavigateToPageOptions) => {
      const shouldExitSubform = options?.searchParams?.has(SearchParams.ExitSubform, 'true') ?? false;
      const replace = options?.replace ?? false;
      if (!page) {
        window.logWarn('navigateToPage called without page');
        return;
      }
      if (!orderRef.current.includes(page) && !shouldExitSubform) {
        window.logWarn('navigateToPage called with invalid page:', `"${page}"`);
        return;
      }

      if (options?.skipAutoSave !== true) {
        await maybeSaveOnPageChange();
      }
      if (shouldExitSubform) {
        await refetchInitialValidations();
      }

      const searchParams = options?.searchParams ? `?${options.searchParams.toString()}` : '';
      if (isStatelessApp) {
        const url = `/${page}${searchParams}`;
        return navigate(url, options, { replace }, { targetLocation: url, callback: () => focusMainContent(options) });
      }

      const { instanceOwnerPartyId, instanceGuid, taskId, mainPageKey, componentId, dataElementId } = navParams.current;

      // Subform
      if (mainPageKey && componentId && dataElementId && !shouldExitSubform) {
        const url = `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}/${mainPageKey}/${componentId}/${dataElementId}/${page}${searchParams}`;
        return navigate(url, options, { replace }, { targetLocation: url, callback: () => focusMainContent(options) });
      }

      const url = `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}/${page}${searchParams}`;
      navigate(url, options, { replace }, { targetLocation: url, callback: () => focusMainContent(options) });
    },
    [orderRef, isStatelessApp, navParams, navigate, maybeSaveOnPageChange, refetchInitialValidations],
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

    const searchParams = new URLSearchParams();
    searchParams.set(SearchParams.ExitSubform, 'true');
    const componentToNavigateTo = navParams.current.componentId;
    if (componentToNavigateTo) {
      searchParams.set(SearchParams.FocusComponentId, componentToNavigateTo);
    }
    await navigateToPage(navParams.current.mainPageKey, { searchParams, resetReturnToView: false });
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
    return navigate(url, undefined, undefined, { targetLocation: url, callback: () => focusMainContent() });
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
  if (!options?.searchParams?.has(SearchParams.FocusComponentId)) {
    document.getElementById('main-content')?.focus();
    window.scrollTo(0, 0);
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

export function useNavigateToComponent() {
  const layoutLookups = useLayoutLookups();
  const { navigateToPage } = useNavigatePage();
  const currentPageId = useCurrentView();
  const [searchParams, setSearchParams] = useSearchParams();

  return async (
    indexedId: string,
    baseComponentId: string,
    options: Omit<NavigateToComponentOptions, 'shouldFocus'> | undefined,
  ) => {
    const targetPage = layoutLookups.componentToPage[baseComponentId];
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set(SearchParams.FocusComponentId, indexedId);
    const errorBindingKey = options?.error?.['bindingKey'];
    if (errorBindingKey) {
      newSearchParams.set(SearchParams.FocusErrorBinding, errorBindingKey);
    }

    if (targetPage && targetPage !== currentPageId) {
      await navigateToPage(targetPage, {
        ...options?.pageNavOptions,
        searchParams: newSearchParams,
        replace:
          !!newSearchParams.get(SearchParams.FocusComponentId) || !!newSearchParams.get(SearchParams.ExitSubform),
      });
    } else {
      setSearchParams(newSearchParams);
    }
  };
}

export interface NavigateToComponentOptions {
  shouldFocus?: boolean;
  pageNavOptions?: NavigateToPageOptions;
  error?: NodeRefValidation;
}
