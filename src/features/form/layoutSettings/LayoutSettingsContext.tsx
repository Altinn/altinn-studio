import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useLayoutSetId } from 'src/features/form/layout/LayoutsContext';
import { useLaxGlobalUISettings } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { GlobalPageSettings, ILayoutSettings, NavigationPageGroup } from 'src/layout/common.generated';

// Also used for prefetching @see formPrefetcher.ts
export function useLayoutSettingsQueryDef(layoutSetId?: string): QueryDefinition<ProcessedLayoutSettings> {
  const { fetchLayoutSettings } = useAppQueries();
  return {
    queryKey: ['layoutSettings', layoutSetId],
    queryFn: async () => processData(layoutSetId ? await fetchLayoutSettings(layoutSetId) : null),
  };
}

function useLayoutSettingsQuery() {
  const layoutSetId = useLayoutSetId();
  const query = useQuery(useLayoutSettingsQueryDef(layoutSetId));

  useEffect(() => {
    query.error && window.logError('Fetching layout settings failed:\n', query.error);
  }, [query.error]);

  return query;
}

function processData(settings: ILayoutSettings | null): ProcessedLayoutSettings {
  if (!settings) {
    return {
      order: [],
      groups: [],
      pageSettings: {},
      pdfLayoutName: undefined,
    };
  }

  if (!('order' in settings.pages) && !('groups' in settings.pages)) {
    const msg = 'Missing page order, specify one of `pages.order` or `pages.groups` in Settings.json';
    window.logError(msg);
    throw new Error(msg);
  }
  if ('order' in settings.pages && 'groups' in settings.pages) {
    const msg = 'Specify one of `pages.order` or `pages.groups` in Settings.json';
    window.logError(msg);
    throw new Error(msg);
  }

  const order: string[] =
    'order' in settings.pages
      ? settings.pages.order
      : settings.pages.groups.filter((group) => 'order' in group).flatMap((group) => group.order);

  return {
    order,
    groups: 'groups' in settings.pages ? settings.pages.groups.map((g) => ({ ...g, id: uuidv4() })) : undefined,
    pageSettings: omitUndefined({
      autoSaveBehavior: settings.pages.autoSaveBehavior,
      expandedWidth: settings.pages.expandedWidth,
      hideCloseButton: settings.pages.hideCloseButton,
      showExpandWidthButton: settings.pages.showExpandWidthButton,
      showLanguageSelector: settings.pages.showLanguageSelector,
      showProgress: settings.pages.showProgress,
      taskNavigation: settings.pages.taskNavigation?.map((g) => ({ ...g, id: uuidv4() })),
    }),
    pdfLayoutName: settings.pages.pdfLayoutName,
  };
}

const { Provider, useCtx, useLaxCtx } = delayedContext(() =>
  createQueryContext<ProcessedLayoutSettings, true>({
    name: 'LayoutSettings',
    required: true,
    query: useLayoutSettingsQuery,
  }),
);

function omitUndefined<T extends { [K: string]: unknown }>(obj: T): Partial<T> {
  return Object.keys(obj).reduce((newObj, key) => {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
    return newObj;
  }, {});
}

interface ProcessedLayoutSettings {
  order: string[];
  groups?: NavigationPageGroup[];
  pageSettings: GlobalPageSettings;
  pdfLayoutName?: string;
}

export const LayoutSettingsProvider = Provider;

/**
 * Returns the raw page order including hidden pages.
 * Returns an empty array if the context is not provided.
 */
export const useRawPageOrder = (): string[] => {
  const settings = useLaxCtx();
  return settings === ContextNotProvided ? emptyArray : settings.order;
};

export const usePdfLayoutName = () => useCtx().pdfLayoutName;
export const usePageGroups = () => {
  const settings = useLaxCtx();
  if (settings === ContextNotProvided) {
    return undefined;
  }
  return settings.groups;
};

const emptyArray = [];

const defaults: Required<GlobalPageSettings> = {
  hideCloseButton: false,
  showLanguageSelector: false,
  showProgress: false,
  showExpandWidthButton: false,
  autoSaveBehavior: 'onChangeFormData',
  expandedWidth: false,
  taskNavigation: [],
};

export const usePageSettings = (): Required<GlobalPageSettings> => {
  const globalUISettings = useLaxGlobalUISettings();
  const layoutSettings = useLaxCtx();

  return useShallowMemo({
    ...defaults,
    ...(globalUISettings === ContextNotProvided ? {} : globalUISettings),
    ...(layoutSettings === ContextNotProvided ? {} : layoutSettings.pageSettings),
  });
};
