import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useLayoutSetId } from 'src/features/form/layout/LayoutsContext';
import { useLaxLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import type { GlobalPageSettings, ILayoutSets, ILayoutSettings, IPagesBaseSettings } from 'src/layout/common.generated';

function useLayoutSettingsQuery() {
  const { fetchLayoutSettings } = useAppQueries();
  const layoutSetId = useLayoutSetId();

  if (!layoutSetId) {
    throw new Error('No layoutSet id found');
  }

  const utils = useQuery({
    queryKey: ['layoutSettings', layoutSetId],
    queryFn: () => fetchLayoutSettings(layoutSetId),
  });

  useEffect(() => {
    utils.error && window.logError('Fetching layout settings failed:\n', utils.error);
  }, [utils.error]);

  return utils;
}

const { Provider, useCtx, useLaxCtx } = delayedContext(() =>
  createQueryContext<ReducedLayoutSettings, true>({
    name: 'LayoutSettings',
    required: true,
    query: useLayoutSettingsQuery,
  }),
);

/**
 * We'll pretend to return a subset of the ILayoutSettings interface, so that we can force you to usePageSettings()
 * instead of useLayoutSettings() for some of these settings. If you wanted to get these settings from
 * useLayoutSettings(), be aware that the settings can be overridden globally in the layout set configuration file
 * as well, so you should definitely use usePageSettings() instead.
 */
interface ReducedLayoutSettings extends ILayoutSettings {
  pages: IPagesBaseSettings;
}

export const LayoutSettingsProvider = Provider;
export const useLayoutSettings = () => useCtx();
export const useLaxLayoutSettings = () => useLaxCtx();

const defaults: Required<GlobalPageSettings> = {
  hideCloseButton: false,
  showLanguageSelector: false,
  showProgress: false,
  showExpandWidthButton: false,
  autoSaveBehavior: 'onChangeFormData',
  expandedWidth: false,
};

export const usePageSettings = (): Required<GlobalPageSettings> => {
  const globalPagesSettings = useLaxLayoutSets();
  const layoutSettings = useLaxLayoutSettings();

  return {
    ...defaults,
    ...(globalPagesSettings === ContextNotProvided ? {} : (globalPagesSettings as ILayoutSets).uiSettings),
    ...(layoutSettings === ContextNotProvided ? {} : layoutSettings.pages),
  };
};
