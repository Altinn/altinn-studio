import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import type { NavigateFunction, NavigateOptions } from 'react-router-dom';

import { ContextNotProvided } from 'src/core/contexts/context';
import { useHiddenPages, useReturnToView } from 'src/features/form/layout/PageNavigationContext';
import { useLaxLayoutSettings, usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxProcessData, useTaskType } from 'src/features/instance/ProcessContext';
import { ProcessTaskType } from 'src/types';
import { promisify } from 'src/utils/promisify';
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
  const pageKey = pageKeyMatch?.params.pageKey ?? statelessMatch?.params.pageKey;

  return {
    partyId,
    instanceGuid,
    taskId,
    pageKey,
    queryKeys,
  };
};

const emptyArray: never[] = [];

export const useCurrentView = () => useNavigationParams().pageKey;
export const useOrder = () => {
  const maybeLayoutSettings = useLaxLayoutSettings();
  const orderWithHidden = maybeLayoutSettings === ContextNotProvided ? emptyArray : maybeLayoutSettings.pages.order;
  const hidden = useHiddenPages();
  const hiddenPages = useMemo(() => new Set(hidden), [hidden]);
  return useMemo(() => orderWithHidden?.filter((page) => !hiddenPages.has(page)), [orderWithHidden, hiddenPages]);
};

export const useNavigatePage = () => {
  const isStatelessApp = useIsStatelessApp();
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const processTasks = useLaxProcessData()?.processTasks;
  const lastTaskId = processTasks?.slice(-1)[0]?.elementId;

  const { partyId, instanceGuid, taskId, pageKey, queryKeys } = useNavigationParams();
  const { autoSaveBehavior } = usePageSettings();

  const taskType = useTaskType(taskId);
  const order = useOrder();

  const currentPageId = pageKey ?? '';
  const currentPageIndex = order?.indexOf(currentPageId) ?? -1;
  const nextPageIndex = currentPageIndex !== -1 ? currentPageIndex + 1 : -1;
  const previousPageIndex = currentPageIndex !== -1 ? currentPageIndex - 1 : -1;

  /**
   * Navigation function for react-router-dom
   * Make sure to clear returnToView on navigation
   */
  const { setReturnToView } = useReturnToView();
  const _navigate = useNavigate();
  const navigate = useCallback(
    (...args: Parameters<NavigateFunction>) => {
      setReturnToView && setReturnToView(undefined);
      return _navigate(...args);
    },
    [_navigate, setReturnToView],
  ) as NavigateFunction;

  const isValidPageId = useCallback(
    (pageId: string) => {
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

  const waitForSave = FD.useWaitForSave();
  const maybeSaveOnPageChange = useCallback(() => {
    if (autoSaveBehavior === 'onChangePage') {
      waitForSave(true).then();
    }
  }, [autoSaveBehavior, waitForSave]);

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
        return navigate(`/${page}${queryKeys}`, { replace });
      }

      const url = `/instance/${partyId}/${instanceGuid}/${taskId}/${page}${queryKeys}`;
      /**
       * Promisify the navigate function to ensure that the page has been navigated to before
       * moving the page focus to the main content on each page navigation. This is
       * done so that the focus of a screen reader user will not be placed at random
       */
      await promisify(() => navigate(url, { replace }))();
      if (options?.shouldFocusComponent !== true) {
        document.getElementById('main-content')?.focus({ preventScroll: true });
      }
    },
    [instanceGuid, isStatelessApp, maybeSaveOnPageChange, navigate, order, partyId, queryKeys, taskId],
  );

  const navigateToTask = useCallback(
    (newTaskId?: string, options?: NavigateOptions) => {
      if (newTaskId === taskId) {
        return;
      }
      const url = `/instance/${partyId}/${instanceGuid}/${newTaskId ?? lastTaskId}${queryKeys}`;
      navigate(url, options);
    },
    [partyId, instanceGuid, lastTaskId, queryKeys, navigate, taskId],
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
