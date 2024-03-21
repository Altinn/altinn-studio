import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useMatch, useNavigate as useRouterNavigate } from 'react-router-dom';
import type { NavigateOptions } from 'react-router-dom';

import { create } from 'zustand';

import { ContextNotProvided } from 'src/core/contexts/context';
import {
  useHiddenPages,
  useSetReturnToView,
  useSetSummaryNodeOfOrigin,
} from 'src/features/form/layout/PageNavigationContext';
import { useLaxLayoutSettings, usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxProcessData, useTaskType } from 'src/features/instance/ProcessContext';
import { ProcessTaskType } from 'src/types';
import { useIsStatelessApp } from 'src/utils/useIsStatelessApp';

type NavigateToPageOptions = {
  replace?: boolean;
  skipAutoSave?: boolean;
  shouldFocusComponent?: boolean;
};

export enum TaskKeys {
  ProcessEnd = 'ProcessEnd',
  CustomReceipt = 'CustomReceipt',
}

export enum SearchParams {
  FocusComponentId = 'focusComponentId',
}

export const useNavigationParams = () => {
  const instanceMatch = useMatch('/instance/:partyId/:instanceGuid');
  const taskIdMatch = useMatch('/instance/:partyId/:instanceGuid/:taskId');
  const pageKeyMatch = useMatch('/instance/:partyId/:instanceGuid/:taskId/:pageKey');
  const statelessMatch = useMatch('/:pageKey');
  const queryKeys = useLocation().search ?? '';

  const partyId = pageKeyMatch?.params.partyId ?? taskIdMatch?.params.partyId ?? instanceMatch?.params.partyId;
  const instanceGuid =
    pageKeyMatch?.params.instanceGuid ?? taskIdMatch?.params.instanceGuid ?? instanceMatch?.params.instanceGuid;
  const taskId = pageKeyMatch?.params.taskId ?? taskIdMatch?.params.taskId;
  const _pageKey = pageKeyMatch?.params.pageKey ?? statelessMatch?.params.pageKey;
  const pageKey = _pageKey === undefined ? undefined : decodeURIComponent(_pageKey);

  return {
    partyId,
    instanceGuid,
    taskId,
    pageKey,
    queryKeys,
  };
};

const emptyArray: never[] = [];

/**
 * Navigation function for react-router-dom
 * Makes sure to clear returnToView and summaryNodeOfOrigin on navigation
 * Takes an optional callback
 */
const useNavigate = () => {
  const navigate = useRouterNavigate();
  const storeCallback = useNavigationEffectStore((state) => state.storeCallback);
  const setReturnToView = useSetReturnToView();
  const setSummaryNodeOfOrigin = useSetSummaryNodeOfOrigin();

  return useCallback(
    (path: string, options?: NavigateOptions, cb?: Callback) => {
      setReturnToView?.(undefined);
      setSummaryNodeOfOrigin?.(undefined);
      if (cb) {
        storeCallback(cb);
      }
      navigate(path, options);
    },
    [navigate, setReturnToView, storeCallback, setSummaryNodeOfOrigin],
  );
};

export const useCurrentView = () => useNavigationParams().pageKey;
export const useOrder = () => {
  const maybeLayoutSettings = useLaxLayoutSettings();
  const orderWithHidden = maybeLayoutSettings === ContextNotProvided ? emptyArray : maybeLayoutSettings.pages.order;
  const hiddenPages = useHiddenPages();
  return useMemo(() => orderWithHidden?.filter((page) => !hiddenPages.has(page)), [orderWithHidden, hiddenPages]);
};

export const useNavigatePage = () => {
  const isStatelessApp = useIsStatelessApp();
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const processTasks = useLaxProcessData()?.processTasks;
  const lastTaskId = processTasks?.slice(-1)[0]?.elementId;
  const navigate = useNavigate();

  const { partyId, instanceGuid, taskId, pageKey, queryKeys } = useNavigationParams();
  const { autoSaveBehavior } = usePageSettings();

  const taskType = useTaskType(taskId);
  const order = useOrder();

  const currentPageId = pageKey ?? '';
  const currentPageIndex = order?.indexOf(currentPageId) ?? -1;
  const nextPageIndex = currentPageIndex !== -1 ? currentPageIndex + 1 : -1;
  const previousPageIndex = currentPageIndex !== -1 ? currentPageIndex - 1 : -1;

  const isValidPageId = useCallback(
    (_pageId: string) => {
      // The page ID may be URL encoded already, if we got this from react-router.
      const pageId = decodeURIComponent(_pageId);
      if (taskType !== ProcessTaskType.Data) {
        return false;
      }
      return order?.includes(pageId) ?? false;
    },
    [order, taskType],
  );

  /**
   * For stateless apps, this is how we redirect to the
   * initial page of the app. We replace the url, to not
   * have the initial page (i.e. the page without a
   * pageKey) in the history.
   */
  useEffect(() => {
    if (isStatelessApp && order?.[0] !== undefined && (!currentPageId || !isValidPageId(currentPageId))) {
      navigate(`/${order?.[0]}${queryKeys}`, { replace: true });
    }
  }, [isStatelessApp, order, navigate, currentPageId, isValidPageId, queryKeys]);

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
      if (!order.includes(page)) {
        window.logWarn('navigateToPage called with invalid page:', `"${page}"`);
        return;
      }

      if (options?.skipAutoSave !== true) {
        maybeSaveOnPageChange();
      }

      if (isStatelessApp) {
        return navigate(`/${page}${queryKeys}`, { replace }, () => focusMainContent(options));
      }

      const url = `/instance/${partyId}/${instanceGuid}/${taskId}/${page}${queryKeys}`;
      navigate(url, { replace }, () => focusMainContent(options));
    },
    [instanceGuid, isStatelessApp, maybeSaveOnPageChange, navigate, order, partyId, queryKeys, taskId],
  );

  const navigateToTask = useCallback(
    (newTaskId?: string, options?: NavigateOptions & { runEffect?: boolean }) => {
      const { runEffect = true } = options ?? {};
      if (newTaskId === taskId) {
        return;
      }
      const url = `/instance/${partyId}/${instanceGuid}/${newTaskId ?? lastTaskId}${queryKeys}`;
      navigate(url, options, runEffect ? () => focusMainContent(options) : undefined);
    },
    [taskId, partyId, instanceGuid, lastTaskId, queryKeys, navigate],
  );

  const isCurrentTask = useMemo(() => {
    if (currentTaskId === undefined && taskId === TaskKeys.CustomReceipt) {
      return true;
    }
    return currentTaskId === taskId;
  }, [currentTaskId, taskId]);

  const startUrl = useMemo(() => {
    if (taskType === ProcessTaskType.Archived) {
      return `/instance/${partyId}/${instanceGuid}/${TaskKeys.ProcessEnd}`;
    }
    if (taskType !== ProcessTaskType.Data && taskId !== undefined) {
      return `/instance/${partyId}/${instanceGuid}/${taskId}`;
    }
    const firstPage = order?.[0];
    if (taskId && firstPage) {
      return `/instance/${partyId}/${instanceGuid}/${taskId}/${firstPage}`;
    }
    if (taskId) {
      return `/instance/${partyId}/${instanceGuid}/${taskId}`;
    }
    return `/instance/${partyId}/${instanceGuid}`;
  }, [partyId, instanceGuid, taskId, order, taskType]);

  const next = order?.[nextPageIndex];
  const previous = order?.[previousPageIndex];

  const isValidTaskId = useCallback(
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

  const getCurrentPageIndex = () => {
    const location = window.location.href;
    const _currentPageId = location.split('/').slice(-1)[0];
    return order?.indexOf(_currentPageId) ?? undefined;
  };

  const getNextPage = () => {
    const currentPageIndex = getCurrentPageIndex();
    const nextPageIndex = currentPageIndex !== undefined ? currentPageIndex + 1 : undefined;

    if (nextPageIndex === undefined) {
      return undefined;
    }
    return order?.[nextPageIndex];
  };

  const getPreviousPage = () => {
    const currentPageIndex = getCurrentPageIndex();
    const nextPageIndex = currentPageIndex !== undefined ? currentPageIndex - 1 : undefined;

    if (nextPageIndex === undefined) {
      return undefined;
    }
    return order?.[nextPageIndex];
  };

  /**
   * This function fetch the next page index on function
   * invocation and then navigates to the next page. This is
   * to be able to chain multiple ClientActions together.
   */
  const navigateToNextPage = () => {
    const nextPage = getNextPage();
    if (!nextPage) {
      window.logWarn('Tried to navigate to next page when standing on the last page.');
      return;
    }
    navigateToPage(nextPage);
  };
  /**
   * This function fetches the previous page index on
   * function invocation and then navigates to the previous
   * page. This is to be able to chain multiple ClientActions
   * together.
   */
  const navigateToPreviousPage = () => {
    const previousPage = getPreviousPage();

    if (!previousPage) {
      window.logWarn('Tried to navigate to previous page when standing on the first page.');
      return;
    }
    navigateToPage(previousPage);
  };

  return {
    navigateToPage,
    navigateToTask,
    isCurrentTask,
    isValidPageId,
    isValidTaskId,
    startUrl,
    order,
    next,
    queryKeys,
    partyId,
    instanceGuid,
    currentPageId,
    taskId,
    previous,
    navigateToNextPage,
    navigateToPreviousPage,
    maybeSaveOnPageChange,
  };
};

export function focusMainContent(options?: NavigateToPageOptions) {
  if (options?.shouldFocusComponent !== true) {
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }
}

type Callback = () => void;
type NavigationEffectStore = {
  callback: Callback | null;
  storeCallback: (cb: Callback | null) => void;
};

export const useNavigationEffectStore = create<NavigationEffectStore>((set) => ({
  callback: null,
  storeCallback: (cb: Callback) => set({ callback: cb }),
}));
