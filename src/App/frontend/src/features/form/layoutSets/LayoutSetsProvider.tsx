import { useLayoutSetsQuery } from 'src/domain/Layout/layoutSetsQuery';

export const useLayoutSets = () => useLayoutSetsQuery().data?.sets || [];

export const useLaxLayoutSets = () => useLayoutSets();

/**
 * **Warning**: You probably want to use `usePageSettings` instead.
 * This returns uiSettings from layout-sets.json,
 * these settings can be overridden by settings in Settings.json
 */
export const useLaxGlobalUISettings = () => useLayoutSetsQuery().data?.uiSettings;
