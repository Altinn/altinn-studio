import { useMemo } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { getUiConfig } from 'src/features/form/ui';
import { useCurrentUiFolderSettingsFromUrl } from 'src/features/form/ui/hooks';

export function useEffectivePageValidation(pageKey: string) {
  const page = FormStore.bootstrap.useLayoutCollection()[pageKey]?.data;
  const task = useCurrentUiFolderSettingsFromUrl()?.pages;
  const app = getUiConfig().settings;

  return useMemo(
    () => ({
      getPageValidation: () =>
        pageKey
          ? (page?.validationOnNavigation ?? task?.validationOnNavigation ?? app?.validationOnNavigation)
          : undefined,
      getReturnValidation: () =>
        page?.validateOnBackToSummary ??
        page?.validationOnNavigation ??
        task?.validateOnBackToSummary ??
        task?.validationOnNavigation ??
        app?.validateOnBackToSummary ??
        app?.validationOnNavigation,
    }),
    [pageKey, page, task, app],
  );
}

export function usePageValidation(componentId: string) {
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const pageKey = layoutLookups.componentToPage[componentId];

  return useEffectivePageValidation(pageKey ?? '');
}
