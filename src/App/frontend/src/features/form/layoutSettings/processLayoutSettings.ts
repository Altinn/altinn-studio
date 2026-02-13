import { useMemo } from 'react';

import { v4 as uuidv4 } from 'uuid';

import { getGlobalUiSettings } from 'src/features/form/layoutSets';
import { useCurrentUiFolderSettingsFromUrl } from 'src/features/form/layoutSets/hooks';
import type { GlobalPageSettings } from 'src/features/form/layoutSets/types';
import type { ILayoutSettings, NavigationPageGroup } from 'src/layout/common.generated';

const emptyArray = [];

export function processLayoutSettings(settings: ILayoutSettings | null | undefined): ProcessedLayoutSettings {
  if (!settings) {
    return {
      order: emptyArray,
      groups: emptyArray,
      pageSettings: getGlobalUiSettings(),
      pdfLayoutName: undefined,
    };
  }

  if (!('order' in settings.pages) && !('groups' in settings.pages)) {
    const msg = 'Missing page order, specify one of `pages.order` or `pages.groups` in Settings.json';
    window.logErrorOnce(msg);
    throw new Error(msg);
  }
  if ('order' in settings.pages && 'groups' in settings.pages) {
    const msg = 'Specify one of `pages.order` or `pages.groups` in Settings.json';
    window.logErrorOnce(msg);
    throw new Error(msg);
  }

  const order: string[] =
    'order' in settings.pages
      ? settings.pages.order
      : settings.pages.groups.filter((group) => 'order' in group).flatMap((group) => group.order);

  const localPageSettings: Partial<GlobalPageSettings> = {
    autoSaveBehavior: settings.pages.autoSaveBehavior,
    expandedWidth: settings.pages.expandedWidth,
    hideCloseButton: settings.pages.hideCloseButton,
    showExpandWidthButton: settings.pages.showExpandWidthButton,
    showLanguageSelector: settings.pages.showLanguageSelector,
    showProgress: settings.pages.showProgress,
    taskNavigation: settings.pages.taskNavigation?.map((g) => ({ ...g, id: uuidv4() })),
  };

  return {
    order,
    groups: 'groups' in settings.pages ? settings.pages.groups.map((g) => ({ ...g, id: uuidv4() })) : undefined,
    pageSettings: {
      ...getGlobalUiSettings(),
      ...omitUndefined(localPageSettings),
    },
    pdfLayoutName: settings.pages.pdfLayoutName,
  };
}

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

const useProcessedLayoutSettings = (): ProcessedLayoutSettings => {
  const settings = useCurrentUiFolderSettingsFromUrl();
  return useMemo(() => processLayoutSettings(settings), [settings]);
};

/**
 * Returns the raw page order including hidden pages.
 * Returns an empty array if the context is not provided.
 */
export const useRawPageOrder = (): string[] => useProcessedLayoutSettings().order;

export const usePdfLayoutName = () => useProcessedLayoutSettings().pdfLayoutName;
export const usePageGroups = () => useProcessedLayoutSettings().groups;
export const usePageSettings = (): GlobalPageSettings => useProcessedLayoutSettings().pageSettings;
