import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';

import { ContextNotProvided } from 'src/core/contexts/context';
import { SearchParams } from 'src/core/routing/types';
import { FormStore, type FormStoreSet, type FormStoreState } from 'src/features/form/FormContext';
import { replaceAndPreventResetOptions } from 'src/features/navigation/navigationOptions';
import { useNavigationParam } from 'src/hooks/navigation';
import { useCurrentView, usePageOrder } from 'src/hooks/useNavigatePage';

type ReturnToView = {
  pageId: string;
  showNextButton?: boolean;
};

export type PageNavigationSliceState = {
  /**
   * Keeps track of which view to return to when the user has navigated
   * with the summary component buttons.
   */
  returnToView?: ReturnToView;
  setReturnToView: (returnToView?: ReturnToView) => void;

  /**
   * Keeps track of which Summary component the user navigated from.
   */
  summaryNodeOfOrigin?: string;
  setSummaryNodeOfOrigin: (componentOrigin?: string) => void;
};

export function createPageNavigationSlice(set: FormStoreSet): FormStoreState['pageNavigation'] {
  return {
    returnToView: undefined,
    setReturnToView: (returnToView) =>
      set((state) => {
        state.pageNavigation.returnToView = returnToView;
      }),
    summaryNodeOfOrigin: undefined,
    setSummaryNodeOfOrigin: (summaryNodeOfOrigin) =>
      set((state) => {
        state.pageNavigation.summaryNodeOfOrigin = summaryNodeOfOrigin;
      }),
  };
}

export const pageNavigationHooks = {
  useReturnToView: () => {
    const returnToView = FormStore.raw.useLaxSelector((s) => s.pageNavigation.returnToView);
    return returnToView === ContextNotProvided ? undefined : returnToView;
  },

  useSetReturnToView: () => {
    const func = FormStore.raw.useLaxSelector((s) => s.pageNavigation.setReturnToView);
    return func === ContextNotProvided ? undefined : func;
  },

  useSummaryNodeIdOfOrigin: (): string | undefined => {
    const ref = FormStore.raw.useLaxSelector((s) => s.pageNavigation.summaryNodeOfOrigin);
    return ref === ContextNotProvided ? undefined : ref;
  },

  useSetSummaryNodeOfOrigin: () => {
    const func = FormStore.raw.useLaxSelector((s) => s.pageNavigation.setSummaryNodeOfOrigin);
    return func === ContextNotProvided ? undefined : func;
  },
};

/**
 * The visible pages from the current page to the return target, both included. Undefined when either is not visible.
 */
export function getReturnRoute(order: string[], from: string | undefined, to: string): string[] | undefined {
  const fromIndex = order.indexOf(from ?? '');
  const toIndex = order.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) {
    return undefined;
  }
  return order.slice(Math.min(fromIndex, toIndex), Math.max(fromIndex, toIndex) + 1);
}

/**
 * A return route is still valid when it shows no page that was missing before.
 */
export function returnRouteStillValid(before: string[] | undefined, after: string[] | undefined): boolean {
  return !!before && !!after && after.every((page) => before.includes(page));
}

export function ClearInvalidReturnState() {
  const readOnly = FormStore.useIsReadOnly();
  const hasParent = FormStore.raw.useSelector((state) => state.parent !== undefined);
  const returnToView = FormStore.pageNavigation.useReturnToView();
  const setReturnToView = FormStore.pageNavigation.useSetReturnToView();
  const setSummaryNodeOfOrigin = FormStore.pageNavigation.useSetSummaryNodeOfOrigin();
  const order = usePageOrder();
  const page = useCurrentView();
  const mainPage = useNavigationParam('mainPageKey');
  // Keep watching the parent page while the user edits one of its subforms.
  const isParentForm = Boolean(mainPage) && !hasParent;
  const currentPage = isParentForm ? mainPage : page;
  const [searchParams, setSearchParams] = useSearchParams();
  // The URL belongs to the active form. A parent only watches its own summary return.
  const backToPage = isParentForm ? null : searchParams.get(SearchParams.BackToPage);
  const summaryPage = returnToView?.pageId;
  const previousRoutes = useRef<
    Partial<Record<'summary' | 'link', { from: string | undefined; to: string; pages: string[] }>>
  >({});

  useEffect(() => {
    if (readOnly) {
      previousRoutes.current = {};
      return;
    }

    const isInvalid = (key: 'summary' | 'link', target: string | null | undefined) => {
      const previous = previousRoutes.current[key];
      delete previousRoutes.current[key];
      if (!target) {
        return false;
      }
      const pages = getReturnRoute(order, currentPage, target);
      const sameRoute = previous?.from === currentPage && previous?.to === target;
      if (!pages || (sameRoute && !returnRouteStillValid(previous?.pages, pages))) {
        return true;
      }
      // Hiding a page is safe, but revealing it again must remove this shortcut.
      previousRoutes.current[key] = { from: currentPage, to: target, pages };
      return false;
    };

    if (isInvalid('summary', summaryPage)) {
      setReturnToView?.(undefined);
      setSummaryNodeOfOrigin?.(undefined);
    }
    if (isInvalid('link', backToPage)) {
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        next.delete(SearchParams.BackToPage);
        return next;
      }, replaceAndPreventResetOptions);
    }
  }, [readOnly, summaryPage, currentPage, order, backToPage, setReturnToView, setSummaryNodeOfOrigin, setSearchParams]);

  return null;
}
