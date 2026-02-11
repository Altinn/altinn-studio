import type { PropsWithChildren } from 'react';

import { getGlobalUiSettings } from 'src/features/form/layoutSets';
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrapProvider';
import type { GlobalPageSettings } from 'src/features/form/layoutSets/types';

export function LayoutSettingsProvider({ children }: PropsWithChildren) {
  return children;
}

/**
 * Returns the raw page order including hidden pages.
 * Returns an empty array if the context is not provided.
 */
export const useRawPageOrder = (): string[] => FormBootstrap.useLaxLayoutSettings()?.order ?? emptyArray;

export const usePdfLayoutName = () => FormBootstrap.useLaxLayoutSettings()?.pdfLayoutName;

export const usePageGroups = () => FormBootstrap.useLaxLayoutSettings()?.groups ?? emptyArray;

const emptyArray: string[] = [];

export function usePageSettings(): GlobalPageSettings {
  const globalUISettings = getGlobalUiSettings();
  const pageSettings = FormBootstrap.useLaxLayoutSettings()?.pageSettings;
  return { ...globalUISettings, ...pageSettings };
}
