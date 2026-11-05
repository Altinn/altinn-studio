import React, { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';

import { ContextNotProvided } from 'src/core/contexts/context';
import { SearchParams } from 'src/core/routing/types';
import { FormStore, type FormStoreSet, type FormStoreState } from 'src/features/form/FormContext';
import { replaceAndPreventResetOptions } from 'src/features/navigation/navigationOptions';
import { getReturnRoute } from 'src/features/navigation/returnRoute';
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

export function ClearInvalidReturnState() {
  const returnToView = FormStore.pageNavigation.useReturnToView();
  const setReturnToView = FormStore.pageNavigation.useSetReturnToView();
  const setSummaryNodeOfOrigin = FormStore.pageNavigation.useSetSummaryNodeOfOrigin();
  const currentPage = useCurrentView();
  const [searchParams, setSearchParams] = useSearchParams();
  const backToPage = searchParams.get(SearchParams.BackToPage);

  return (
    <>
      {returnToView && (
        <ClearReturnStateForChangedRoute
          key={`summary:${currentPage}:${returnToView.pageId}`}
          pageId={returnToView.pageId}
          onReset={() => {
            setReturnToView?.(undefined);
            setSummaryNodeOfOrigin?.(undefined);
          }}
        />
      )}
      {backToPage && (
        <ClearReturnStateForChangedRoute
          key={`link:${currentPage}:${backToPage}`}
          pageId={backToPage}
          onReset={() =>
            setSearchParams((previous) => {
              const next = new URLSearchParams(previous);
              next.delete(SearchParams.BackToPage);
              return next;
            }, replaceAndPreventResetOptions)
          }
        />
      )}
    </>
  );
}

function ClearReturnStateForChangedRoute({ pageId, onReset }: { pageId: string; onReset: () => void }) {
  const order = usePageOrder();
  const currentPage = useCurrentView();
  const route = useMemo(() => getReturnRoute(order, currentPage, pageId), [order, currentPage, pageId]);
  // A return shortcut belongs to one edit detour; undoing an answer must not restore it.
  const originalRoute = useRef(route);

  useEffect(() => {
    if (
      !route ||
      route.length !== originalRoute.current?.length ||
      route.some((page, index) => page !== originalRoute.current?.[index])
    ) {
      onReset();
    }
  }, [route, onReset]);

  return null;
}
