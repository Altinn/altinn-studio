import { useMemo } from 'react';

import { usePageSettings } from 'src/features/form/layoutSettings/processLayoutSettings';
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrap';
import type { PageValidation } from 'src/layout/common.generated';

export function useEffectivePageValidation(pageKey: string): {
  getPageValidation: () => PageValidation | undefined;
} {
  const layoutCollection = FormBootstrap.useLayoutCollection();
  const effectivePageValidation = usePageSettings().validationOnNavigation;

  return useMemo(() => {
    if (!pageKey) {
      return { getPageValidation: () => undefined };
    }
    const currentPageLayout = layoutCollection[pageKey];
    const pageValidation = currentPageLayout?.data?.validationOnNavigation;

    const validationOnNavigation = pageValidation ?? effectivePageValidation;

    return {
      getPageValidation: () => validationOnNavigation,
    };
  }, [pageKey, layoutCollection, effectivePageValidation]);
}

export function usePageValidation(componentId: string) {
  const layoutLookups = FormBootstrap.useLayoutLookups();
  const pageKey = layoutLookups.componentToPage[componentId];

  return useEffectivePageValidation(pageKey ?? '');
}
