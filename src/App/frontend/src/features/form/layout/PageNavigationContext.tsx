import { ContextNotProvided } from 'src/core/contexts/context';
import { FormStore, type FormStoreSet, type FormStoreState } from 'src/features/form/FormContext';

export type PageNavigationSliceState = {
  /**
   * Keeps track of which view to return to when the user has navigated
   * with the summary component buttons.
   */
  returnToView?: string;
  setReturnToView: (returnToView?: string) => void;

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
