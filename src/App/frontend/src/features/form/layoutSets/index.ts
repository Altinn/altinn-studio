import type { GlobalPageSettings } from 'src/features/form/layoutSets/types';

export function getLayoutSets() {
  return globalThis.altinnAppGlobalData.layoutSets.sets;
}

export function getGlobalUiSettings(): GlobalPageSettings {
  return globalThis.altinnAppGlobalData.layoutSets.uiSettings;
}
