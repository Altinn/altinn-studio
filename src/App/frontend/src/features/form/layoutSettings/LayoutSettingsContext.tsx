import type { PropsWithChildren } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { getGlobalUiSettings } from 'src/features/form/layoutSets';
import { useLaxFormBootstrap } from 'src/features/formBootstrap/FormBootstrapProvider';
import type { GlobalPageSettings } from 'src/features/form/layoutSets/types';

export function LayoutSettingsProvider({ children }: PropsWithChildren) {
  return children;
}

/**
 * Returns the raw page order including hidden pages.
 * Returns an empty array if the context is not provided.
 */
export const useRawPageOrder = (): string[] => {
  const bootstrap = useLaxFormBootstrap();
  return bootstrap === ContextNotProvided ? emptyArray : bootstrap.layoutSettings.order;
};

export const usePdfLayoutName = () => {
  const bootstrap = useLaxFormBootstrap();
  return bootstrap === ContextNotProvided ? undefined : bootstrap.layoutSettings.pdfLayoutName;
};

export const usePageGroups = () => {
  const bootstrap = useLaxFormBootstrap();
  return bootstrap === ContextNotProvided ? undefined : bootstrap.layoutSettings.groups;
};

const emptyArray: string[] = [];

export function usePageSettings(): GlobalPageSettings {
  const globalUISettings = getGlobalUiSettings();
  const bootstrap = useLaxFormBootstrap();
  const pageSettings = bootstrap === ContextNotProvided ? undefined : bootstrap.layoutSettings.pageSettings;
  return {
    ...globalUISettings,
    ...pageSettings,
  };
}
