import { useMemo } from 'react';

import type { PageValidation } from '@app/layout-contract/generated/common.generated';
import type { CompNavigationButtonsExternal } from '@app/layout-contract/generated/components/NavigationButtons/config.generated';

import { FormStore } from 'src/features/form/FormContext';
import { getUiConfig } from 'src/features/form/ui';
import { useCurrentUiFolderSettingsFromUrl } from 'src/features/form/ui/hooks';
import { resolveNavigationValidation } from 'src/features/navigation/resolveNavigationValidation';

export function useEffectivePageValidation(pageKey: string): {
  getPageValidation: () => PageValidation | undefined;
  getReturnValidation: (
    component: Pick<CompNavigationButtonsExternal, 'validateOnNext' | 'validateOnBackToSummary'>,
  ) => PageValidation | undefined;
} {
  const layoutCollection = FormStore.bootstrap.useLayoutCollection();
  const taskSettings = useCurrentUiFolderSettingsFromUrl()?.pages;
  const globalSettings = getUiConfig().settings;

  return useMemo(() => {
    const settings = [layoutCollection[pageKey]?.data, taskSettings, globalSettings];

    return {
      getPageValidation: () => (pageKey ? resolveNavigationValidation(settings, 'next') : undefined),
      getReturnValidation: (component) =>
        resolveNavigationValidation(
          [
            {
              validationOnNavigation: component.validateOnNext,
              validateOnBackToSummary: component.validateOnBackToSummary,
            },
            ...settings,
          ],
          'return',
        ),
    };
  }, [pageKey, layoutCollection, taskSettings, globalSettings]);
}

export function usePageValidation(componentId: string) {
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const pageKey = layoutLookups.componentToPage[componentId];

  return useEffectivePageValidation(pageKey ?? '');
}
