import type { GlobalPageSettings } from 'src/features/form/layoutSets/types';

export function getLayoutSets() {
  return window.altinnAppGlobalData.layoutSets.sets;
}

export function getGlobalUiSettings(): GlobalPageSettings {
  return window.altinnAppGlobalData.layoutSets.uiSettings;
}
