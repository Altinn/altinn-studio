import type { GlobalPageSettings } from 'src/layout/common.generated';

export function getLayoutSets() {
  return window.altinnAppGlobalData.layoutSets.sets;
}

export function getGlobalUiSettings(): GlobalPageSettings {
  return window.altinnAppGlobalData.layoutSets.uiSettings;
}
