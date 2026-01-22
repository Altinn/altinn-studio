import { v4 as uuidv4 } from 'uuid';

import type { GlobalPageSettings } from 'src/features/layoutSets/types';

export function getLayoutSets() {
  return window.altinnAppGlobalData.layoutSets.sets;
}

export function getGlobalUiSettings(): GlobalPageSettings {
  const globalUISettings = window.altinnAppGlobalData.layoutSets.uiSettings;

  return {
    ...globalUISettings,
    taskNavigation: (globalUISettings.taskNavigation ?? []).map((g) => ({ ...g, id: g.id ?? uuidv4() })),
  };
}
