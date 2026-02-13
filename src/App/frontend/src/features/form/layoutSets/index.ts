import type { GlobalPageSettings, UiFolders } from 'src/features/form/layoutSets/types';
import type { ILayoutSettings } from 'src/layout/common.generated';

export const defaultGlobalUiSettings: GlobalPageSettings = {
  hideCloseButton: false,
  showLanguageSelector: false,
  showExpandWidthButton: false,
  expandedWidth: false,
  showProgress: true,
  autoSaveBehavior: 'onChangePage',
  taskNavigation: [],
};

export function getUiConfig() {
  return window.altinnAppGlobalData.ui;
}

export function getUiFolders(): UiFolders {
  return getUiConfig().folders;
}

/**
 * @see usePageSettings
 */
export function getGlobalUiSettings(): GlobalPageSettings {
  return {
    ...defaultGlobalUiSettings,
    ...getUiConfig().settings,
  };
}

/**
 * @see useCurrentUiFolderSettings
 */
export function getUiFolderSettings(folderId: string | undefined): ILayoutSettings | undefined {
  const folders = getUiFolders();
  return folderId ? folders[folderId] : undefined;
}

export function getDefaultDataTypeFromUiFolder(uiFolder: string | undefined) {
  return uiFolder ? getUiFolderSettings(uiFolder)?.defaultDataType : undefined;
}
