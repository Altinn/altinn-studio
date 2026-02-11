import type { GlobalPageSettings, UiFolders } from 'src/features/form/layoutSets/types';

const defaultGlobalUiSettings: GlobalPageSettings = {
  hideCloseButton: false,
  showLanguageSelector: false,
  showExpandWidthButton: false,
  expandedWidth: false,
  showProgress: true,
  autoSaveBehavior: 'onChangePage',
  taskNavigation: [],
};

export function getUiFolders(): UiFolders {
  return window.altinnAppGlobalData.ui?.folders ?? {};
}

export function getGlobalUiSettings(): GlobalPageSettings {
  return window.altinnAppGlobalData.ui?.settings ?? defaultGlobalUiSettings;
}

export function getUiFolderSettings(folderId: string) {
  return getUiFolders()[folderId];
}
