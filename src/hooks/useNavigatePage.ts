import { useCallback, useEffect, useMemo } from 'react';
import type { NavigateOptions } from 'react-router-dom';

import { ContextNotProvided } from 'src/core/contexts/context';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useSetReturnToView, useSetSummaryNodeOfOrigin } from 'src/features/form/layout/PageNavigationContext';
import { useLaxLayoutSettings, usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useGetTaskTypeById, useLaxProcessData } from 'src/features/instance/ProcessContext';
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
import { useIsPdf } from 'src/hooks/useIsPdf';
import { ProcessTaskType } from 'src/types';
import { Hidden } from 'src/utils/layout/NodesContext';
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

const emptyArray: never[] = [];

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
  const isPdf = useIsPdf();

  const maybeLayoutSettings = useLaxLayoutSettings();
  const orderWithHidden = maybeLayoutSettings === ContextNotProvided ? emptyArray : maybeLayoutSettings.pages.order;

  const hiddenFromPdf = useMemo(
    () => new Set(maybeLayoutSettings !== ContextNotProvided && isPdf ? maybeLayoutSettings.pages.excludeFromPdf : []),
    [maybeLayoutSettings, isPdf],
  );
  const hiddenPages = Hidden.useHiddenPages();

  return useMemo(
    () => orderWithHidden?.filter((page) => !hiddenPages.has(page) && !hiddenFromPdf.has(page)),
    [orderWithHidden, hiddenPages, hiddenFromPdf],
  );
};

export const useIsCurrentTask = () => {
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const taskId = useNavigationParam('taskId');
  return useMemo(() => {
    if (currentTaskId === undefined && taskId === TaskKeys.CustomReceipt) {
      return true;
    }
    return currentTaskId === taskId;
  }, [currentTaskId, taskId]);
};

export const usePreviousPageKey = () => {
  const order = usePageOrder();

  const currentPageId = useNavigationParam('pageKey') ?? '';
  const currentPageIndex = order?.indexOf(currentPageId) ?? -1;
  const previousPageIndex = currentPageIndex !== -1 ? currentPageIndex - 1 : -1;

  return order?.[previousPageIndex];
};

export const useNextPageKey = () => {
  const order = usePageOrder();

  const currentPageId = useNavigationParam('pageKey') ?? '';
  const currentPageIndex = order?.indexOf(currentPageId) ?? -1;
  const nextPageIndex = currentPageIndex !== -1 ? currentPageIndex + 1 : -1;

  return order?.[nextPageIndex];
};

export const useStartUrl = (forcedTaskId?: string) => {
  const queryKeys = useQueryKeysAsString();
  const order = usePageOrder();
  // This needs up to date params, so using the native hook that re-renders often
  // However, this hook is only used in cases where we immediately navigate to a different path
  // so it does not make a difference here.
  const { partyId, instanceGuid, taskId, mainPageKey, componentId, dataElementId } = useNavigationParams();
  const isSubformPage = !!mainPageKey;
  const taskType = useGetTaskTypeById()(taskId);
  const isStateless = useApplicationMetadata().isStatelessApp;

  return useMemo(() => {
    const firstPage = order?.[0];
    if (isStateless && firstPage) {
      return `/${firstPage}${queryKeys}`;
    }
    if (typeof forcedTaskId === 'string') {
      return `/instance/${partyId}/${instanceGuid}/${forcedTaskId}${queryKeys}`;
    }
    if (taskType === ProcessTaskType.Archived) {
      return `/instance/${partyId}/${instanceGuid}/${TaskKeys.ProcessEnd}${queryKeys}`;
    }
    if (taskType !== ProcessTaskType.Data && taskId !== undefined) {
      return `/instance/${partyId}/${instanceGuid}/${taskId}${queryKeys}`;
    }
    if (isSubformPage && taskId && mainPageKey && componentId && dataElementId && firstPage) {
      return `/instance/${partyId}/${instanceGuid}/${taskId}/${mainPageKey}/${componentId}/${dataElementId}/${firstPage}${queryKeys}`;
    }
    if (taskId && firstPage) {
      return `/instance/${partyId}/${instanceGuid}/${taskId}/${firstPage}${queryKeys}`;
    }
    if (taskId) {
      return `/instance/${partyId}/${instanceGuid}/${taskId}${queryKeys}`;
    }
    return `/instance/${partyId}/${instanceGuid}${queryKeys}`;
  }, [
    componentId,
    dataElementId,
    forcedTaskId,
    instanceGuid,
    isStateless,
    isSubformPage,
    mainPageKey,
    order,
    partyId,
    queryKeys,
    taskId,
    taskType,
  ]);
};

export function useNavigateToTask() {
  const processTasks = useLaxProcessData()?.processTasks;
  const lastTaskId = processTasks?.slice(-1)[0]?.elementId;
  const navigate = useNavigate();
  const navParams = useAllNavigationParamsAsRef();
  const queryKeysRef = useQueryKeysAsStringAsRef();

  return useCallback(
    (newTaskId?: string, options?: NavigateOptions & { runEffect?: boolean }) => {
      const { runEffect = true } = options ?? {};
      const { partyId, instanceGuid, taskId } = navParams.current;
      if (newTaskId === taskId) {
        return;
      }
      const url = `/instance/${partyId}/${instanceGuid}/${newTaskId ?? lastTaskId}${queryKeysRef.current}`;
      navigate(url, undefined, options, runEffect ? () => focusMainContent(options) : undefined);
    },
    [lastTaskId, navParams, navigate, queryKeysRef],
  );
}

export function useIsValidTaskId() {
  const processTasks = useLaxProcessData()?.processTasks;

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

  const isValidPageId = useCallback(
    (_pageId: string) => {
      // The page ID may be URL encoded already, if we got this from react-router.
      const pageId = decodeURIComponent(_pageId);
      if (getTaskType(navParams.current.taskId) !== ProcessTaskType.Data) {
        return false;
      }
      return order?.includes(pageId) ?? false;
    },
    [getTaskType, navParams, order],
  );

  /**
   * For stateless apps, this is how we redirect to the
   * initial page of the app. We replace the url, to not
   * have the initial page (i.e. the page without a
   * pageKey) in the history.
   */
  useEffect(() => {
    const currentPageId = navParams.current.pageKey ?? '';
    if (isStatelessApp && order?.[0] !== undefined && (!currentPageId || !isValidPageId(currentPageId))) {
      navigate(`/${order?.[0]}${queryKeysRef.current}`, { replace: true });
    }
  }, [isStatelessApp, order, navigate, isValidPageId, navParams, queryKeysRef]);

  const requestManualSave = FD.useRequestManualSave();
  const maybeSaveOnPageChange = useCallback(() => {
    if (autoSaveBehavior === 'onChangePage') {
      requestManualSave();
    }
  }, [autoSaveBehavior, requestManualSave]);

  const navigateToPage = useCallback(
    async (page?: string, options?: NavigateToPageOptions) => {
      const replace = options?.replace ?? false;
      if (!page) {
        window.logWarn('navigateToPage called without page');
        return;
      }
      if (!order.includes(page) && options?.exitSubform !== true) {
        window.logWarn('navigateToPage called with invalid page:', `"${page}"`);
        return;
      }

      if (options?.skipAutoSave !== true) {
        maybeSaveOnPageChange();
      }

      if (isStatelessApp) {
        return navigate(`/${page}${queryKeysRef.current}`, options, { replace }, () => focusMainContent(options));
      }

      const { partyId, instanceGuid, taskId, mainPageKey, componentId, dataElementId } = navParams.current;

      // Subform
      if (mainPageKey && componentId && dataElementId && options?.exitSubform !== true) {
        const url = `/instance/${partyId}/${instanceGuid}/${taskId}/${mainPageKey}/${componentId}/${dataElementId}/${page}${queryKeysRef.current}`;
        return navigate(url, options, { replace }, () => focusMainContent(options));
      }

      let url = `/instance/${partyId}/${instanceGuid}/${taskId}/${page}`;

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
    [isStatelessApp, maybeSaveOnPageChange, navParams, navigate, order, queryKeysRef],
  );

  const trimSingleTrailingSlash = (str: string) => (str.endsWith('/') ? str.slice(0, -1) : str);
  const getCurrentPageIndex = useCallback(() => {
    const location = trimSingleTrailingSlash(window.location.href.split('?')[0]);
    const _currentPageId = location.split('/').slice(-1)[0];
    return order?.indexOf(_currentPageId) ?? undefined;
  }, [order]);

  const getNextPage = useCallback(() => {
    const currentPageIndex = getCurrentPageIndex();
    const nextPageIndex = currentPageIndex !== undefined ? currentPageIndex + 1 : undefined;

    if (nextPageIndex === undefined) {
      return undefined;
    }
    return order?.[nextPageIndex];
  }, [getCurrentPageIndex, order]);

  const getPreviousPage = useCallback(() => {
    const currentPageIndex = getCurrentPageIndex();
    const nextPageIndex = currentPageIndex !== undefined ? currentPageIndex - 1 : undefined;

    if (nextPageIndex === undefined) {
      return undefined;
    }
    return order?.[nextPageIndex];
  }, [getCurrentPageIndex, order]);

  /**
   * This function fetch the next page index on function
   * invocation and then navigates to the next page. This is
   * to be able to chain multiple ClientActions together.
   */
  const navigateToNextPage = useCallback(async () => {
    const nextPage = getNextPage();
    if (!nextPage) {
      window.logWarn('Tried to navigate to next page when standing on the last page.');
      return;
    }
    await navigateToPage(nextPage);
  }, [getNextPage, navigateToPage]);

  /**
   * This function fetches the previous page index on
   * function invocation and then navigates to the previous
   * page. This is to be able to chain multiple ClientActions
   * together.
   */
  const navigateToPreviousPage = useCallback(async () => {
    const previousPage = getPreviousPage();

    if (!previousPage) {
      window.logWarn('Tried to navigate to previous page when standing on the first page.');
      return;
    }
    await navigateToPage(previousPage);
  }, [getPreviousPage, navigateToPage]);

  const exitSubform = async () => {
    if (!navParams.current.mainPageKey) {
      window.logWarn('Tried to close subform page while not in a subform.');
      return;
    }
    await refetchInitialValidations();

    await navigateToPage(navParams.current.mainPageKey, {
      exitSubform: true,
      resetReturnToView: false,
      focusComponentId: navParams.current.componentId,
    });
  };

  return {
    navigateToPage,
    isValidPageId,
    order,
    navigateToNextPage,
    navigateToPreviousPage,
    maybeSaveOnPageChange,
    exitSubform,
  };
}

export function focusMainContent(options?: NavigateToPageOptions) {
  if (options?.shouldFocusComponent !== true) {
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }
}
