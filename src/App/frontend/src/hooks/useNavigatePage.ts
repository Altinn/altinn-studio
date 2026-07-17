import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import type { NavigateOptions } from 'react-router';

import { useRefetchInitialValidations } from 'src/core/queries/backendValidation';
import { SearchParams } from 'src/core/routing/types';
import { useIsStateless } from 'src/features/applicationMetadata';
import { FormStore } from 'src/features/form/FormContext';
import { usePageSettings, useRawPageOrder } from 'src/features/form/layoutSettings/processLayoutSettings';
import { getUiConfig } from 'src/features/form/ui';
import { useGetTaskTypeById, useProcessQuery } from 'src/features/instance/useProcessQuery';
import {
  preventFocusAndScrollResetOptions,
  replaceAndPreventResetOptions,
} from 'src/features/navigation/navigationOptions';
import { useAllNavigationParams, useAllNavigationParamsAsRef, useNavigationParam } from 'src/hooks/navigation';
import { useAsRef } from 'src/hooks/useAsRef';
import { useLocalStorageState } from 'src/hooks/useLocalStorageState';
import { TaskKeys } from 'src/routesBuilder';
import { ProcessTaskType } from 'src/types';
import { computeStartUrl } from 'src/utils/computeStartUrl';
import { useHiddenPages } from 'src/utils/layout/hidden';
import type { NodeRefValidation } from 'src/features/validation';

export interface NavigateToPageOptions {
  replace?: boolean;
  skipAutoSave?: boolean;
  resetReturnToView?: boolean;
  searchParams?: URLSearchParams;
}

/**
 * Navigation function for react-router
 * Makes sure to clear returnToView and summaryNodeOfOrigin on navigation
 * Takes an optional callback
 */

const useOurNavigate = () => {
  const setReturnToView = FormStore.pageNavigation.useSetReturnToView();
  const setSummaryNodeOfOrigin = FormStore.pageNavigation.useSetSummaryNodeOfOrigin();
  const navigate = useNavigate();

  return useCallback(
    (path: string, ourOptions?: Pick<NavigateToPageOptions, 'resetReturnToView'>, theirOptions?: NavigateOptions) => {
      const resetReturnToView = ourOptions?.resetReturnToView ?? true;
      if (resetReturnToView) {
        setReturnToView?.(undefined);
        setSummaryNodeOfOrigin?.(undefined);
      }
      navigate(path, theirOptions);
    },
    [navigate, setReturnToView, setSummaryNodeOfOrigin],
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
  const taskType = useGetTaskTypeById()(taskId);
  const isStateless = useIsStateless();

  return useMemo(
    () =>
      computeStartUrl({
        instanceOwnerPartyId,
        instanceGuid,
        taskId,
        mainPageKey,
        componentId,
        dataElementId,
        queryKeys,
        firstPage: order?.[0],
        forcedTaskId,
        taskType,
        isStateless,
      }),
    [
      componentId,
      dataElementId,
      forcedTaskId,
      instanceGuid,
      isStateless,
      mainPageKey,
      order,
      instanceOwnerPartyId,
      queryKeys,
      taskId,
      taskType,
    ],
  );
};

export function useNavigateToTask() {
  const navigate = useOurNavigate();
  const navParams = useAllNavigationParamsAsRef();
  const queryKeysRef = useAsRef(useLocation().search);
  const uiFolders = getUiConfig().folders;

  return useCallback(
    (newTaskId: string, options?: NavigateOptions) => {
      const { instanceOwnerPartyId, instanceGuid, taskId } = navParams.current;
      if (newTaskId === taskId) {
        return;
      }
      let realTaskId = newTaskId;
      if (newTaskId === TaskKeys.ProcessEnd || newTaskId === TaskKeys.CustomReceipt) {
        // Go to the correct receipt, no matter what we're actually given
        realTaskId = TaskKeys.CustomReceipt in uiFolders ? TaskKeys.CustomReceipt : TaskKeys.ProcessEnd;
      }
      const url = `/instance/${instanceOwnerPartyId}/${instanceGuid}/${realTaskId}${queryKeysRef.current}`;
      navigate(url, undefined, options);
    },
    [navParams, navigate, queryKeysRef, uiFolders],
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

export function useIsValidPageId() {
  const navParams = useAllNavigationParamsAsRef();
  const getTaskType = useGetTaskTypeById();
  const order = usePageOrder();
  const orderRef = useAsRef(order);

  return useCallback(
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
}

export function useMaybeSaveOnPageChange() {
  const { autoSaveBehavior } = usePageSettings();
  const waitForSave = FormStore.data.useWaitForSave();

  return useCallback(async () => {
    await waitForSave(autoSaveBehavior === 'onChangePage');
  }, [autoSaveBehavior, waitForSave]);
}

export function useNavigateToPage() {
  const isStateless = useIsStateless();
  const navigate = useOurNavigate();
  const navParams = useAllNavigationParamsAsRef();
  const orderRef = useAsRef(usePageOrder());
  const maybeSaveOnPageChange = useMaybeSaveOnPageChange();
  const [_, setVisitedPages] = useVisitedPages();

  return useCallback(
    async (page?: string, options?: NavigateToPageOptions) => {
      const preventScrollReset = options?.searchParams?.has(SearchParams.FocusComponentId);
      const navOptions: NavigateOptions = {
        replace: options?.replace ?? false,
        ...(preventScrollReset ? preventFocusAndScrollResetOptions : undefined),
      };
      if (!page) {
        window.logWarn('navigateToPage called without page');
        return;
      }
      if (!orderRef.current.includes(page)) {
        window.logWarn('navigateToPage called with invalid page:', `"${page}"`);
        return;
      }

      if (options?.skipAutoSave !== true) {
        await maybeSaveOnPageChange();
      }

      setVisitedPages((visitedPages) => {
        const currentPage = navParams.current.pageKey;
        if (!currentPage || visitedPages.includes(currentPage)) {
          return visitedPages;
        }
        return [...visitedPages, currentPage];
      });

      const searchParams = options?.searchParams ? `?${options.searchParams.toString()}` : '';
      if (isStateless) {
        const url = `/${page}${searchParams}`;
        return navigate(url, options, navOptions);
      }

      const { instanceOwnerPartyId, instanceGuid, taskId, mainPageKey, componentId, dataElementId } = navParams.current;

      // Subform
      if (mainPageKey && componentId && dataElementId) {
        const url = `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}/${mainPageKey}/${componentId}/${dataElementId}/${page}${searchParams}`;
        return navigate(url, options, navOptions);
      }

      const url = `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}/${page}${searchParams}`;
      navigate(url, options, navOptions);
    },
    [orderRef, isStateless, navParams, navigate, maybeSaveOnPageChange, setVisitedPages],
  );
}

export function useExitSubform() {
  const isStateless = useIsStateless();
  const navigate = useOurNavigate();
  const navParams = useAllNavigationParamsAsRef();
  const refetchInitialValidations = useRefetchInitialValidations();
  const maybeSaveOnPageChange = useMaybeSaveOnPageChange();
  const [_, setVisitedPages] = useVisitedPages();

  return useCallback(async () => {
    const { mainPageKey, componentId, pageKey, instanceOwnerPartyId, instanceGuid, taskId } = navParams.current;
    if (!mainPageKey) {
      window.logWarn('Tried to close subform page while not in a subform.');
      return;
    }

    await maybeSaveOnPageChange();
    await refetchInitialValidations();

    setVisitedPages((visitedPages) => {
      if (!pageKey || visitedPages.includes(pageKey)) {
        return visitedPages;
      }
      return [...visitedPages, pageKey];
    });

    const searchParams = new URLSearchParams();
    searchParams.set(SearchParams.ExitSubform, 'true');
    if (componentId) {
      searchParams.set(SearchParams.FocusComponentId, componentId);
    }

    const search = `?${searchParams.toString()}`;
    if (isStateless) {
      return navigate(`/${mainPageKey}${search}`, { resetReturnToView: false }, preventFocusAndScrollResetOptions);
    }

    const url = `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}/${mainPageKey}${search}`;
    return navigate(url, { resetReturnToView: false }, preventFocusAndScrollResetOptions);
  }, [isStateless, maybeSaveOnPageChange, navigate, navParams, refetchInitialValidations, setVisitedPages]);
}

export function useEnterSubform() {
  const navigate = useOurNavigate();
  const navParams = useAllNavigationParamsAsRef();
  const refetchInitialValidations = useRefetchInitialValidations();
  const orderRef = useAsRef(usePageOrder());
  const maybeSaveOnPageChange = useMaybeSaveOnPageChange();

  return useCallback(
    async ({
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
      return navigate(url);
    },
    [maybeSaveOnPageChange, navigate, navParams, orderRef, refetchInitialValidations],
  );
}

function useEnsureValidCurrentPage() {
  const isStateless = useIsStateless();
  const navigate = useOurNavigate();
  const navParams = useAllNavigationParamsAsRef();
  const [_searchParams] = useSearchParams();
  const searchParamsRef = useAsRef(_searchParams);
  const orderRef = useAsRef(usePageOrder());
  const isValidPageId = useIsValidPageId();

  /**
   * For stateless apps, this is how we redirect to the
   * initial page of the app. We replace the url, to not
   * have the initial page (i.e. the page without a
   * pageKey) in the history.
   */
  useEffect(() => {
    const currentPageId = navParams.current.pageKey ?? '';
    if (isStateless && orderRef.current[0] !== undefined && (!currentPageId || !isValidPageId(currentPageId))) {
      navigate(`/${orderRef.current[0]}?${searchParamsRef.current}`, undefined, replaceAndPreventResetOptions);
    }
  }, [isStateless, orderRef, navigate, isValidPageId, navParams, searchParamsRef]);
}

export function useNavigateToNextPage() {
  const navParams = useAllNavigationParamsAsRef();
  const navigateToPage = useNavigateToPage();
  const orderRef = useAsRef(usePageOrder());

  /**
   * This function fetch the next page index on function
   * invocation and then navigates to the next page. This is
   * to be able to chain multiple ClientActions together.
   */
  return useCallback(
    async (options?: NavigateToPageOptions) => {
      const currentPage = navParams.current.pageKey;
      const nextPage = getNextPageKey(orderRef.current, currentPage);
      if (!nextPage) {
        window.logWarn('Tried to navigate to next page when standing on the last page.');
        return;
      }

      await navigateToPage(nextPage, options);
    },
    [navParams, navigateToPage, orderRef],
  );
}

export function useNavigateToPreviousPage() {
  const navParams = useAllNavigationParamsAsRef();
  const navigateToPage = useNavigateToPage();
  const orderRef = useAsRef(usePageOrder());

  /**
   * This function fetches the previous page index on
   * function invocation and then navigates to the previous
   * page. This is to be able to chain multiple ClientActions
   * together.
   */
  return useCallback(
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
}

export function useNavigatePage() {
  useEnsureValidCurrentPage();

  const order = usePageOrder();
  const isValidPageId = useIsValidPageId();
  const navigateToPage = useNavigateToPage();
  const navigateToNextPage = useNavigateToNextPage();
  const navigateToPreviousPage = useNavigateToPreviousPage();
  const maybeSaveOnPageChange = useMaybeSaveOnPageChange();
  const exitSubform = useExitSubform();
  const enterSubform = useEnterSubform();

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
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const navigateToPage = useNavigateToPage();
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
      setSearchParams(newSearchParams, preventFocusAndScrollResetOptions);
    }
  };
}

export interface NavigateToComponentOptions {
  shouldFocus?: boolean;
  pageNavOptions?: NavigateToPageOptions;
  error?: NodeRefValidation;
}
