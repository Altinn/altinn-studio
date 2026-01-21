import type { GlobalPageSettings } from 'src/features/layoutSets/types';

export function getLayoutSets() {
  return window.altinnAppGlobalData.layoutSetsConfig.sets;
}

export function getGlobalUiSettings(): GlobalPageSettings {
  return window.altinnAppGlobalData.layoutSetsConfig.uiSettings;
}
