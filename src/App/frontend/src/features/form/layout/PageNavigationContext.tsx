import React, { useEffect } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { FormStore, type FormStoreSet, type FormStoreState } from 'src/features/form/FormContext';
import { useIsHiddenPage } from 'src/utils/layout/hidden';

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

export function ClearHiddenSummaryReturnState() {
  const returnToView = FormStore.pageNavigation.useReturnToView();
  return returnToView ? (
    <ClearReturnStateForHiddenPage
      key={returnToView.pageId}
      pageId={returnToView.pageId}
    />
  ) : null;
}

function ClearReturnStateForHiddenPage({ pageId }: { pageId: string }) {
  const setReturnToView = FormStore.pageNavigation.useSetReturnToView();
  const setSummaryNodeOfOrigin = FormStore.pageNavigation.useSetSummaryNodeOfOrigin();
  const hidden = useIsHiddenPage(pageId, { respectPageOrder: true, respectDevTools: false });

  useEffect(() => {
    if (hidden) {
      setReturnToView?.(undefined);
      setSummaryNodeOfOrigin?.(undefined);
    }
  }, [hidden, setReturnToView, setSummaryNodeOfOrigin]);

  return null;
}
