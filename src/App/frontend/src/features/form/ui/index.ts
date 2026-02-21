import type { GlobalPageSettings } from 'src/features/form/ui/types';
import type { ILayoutSettings } from 'src/layout/common.generated';

export const defaultGlobalUiSettings: GlobalPageSettings = {
  hideCloseButton: false,
  showLanguageSelector: false,
  showExpandWidthButton: false,
  expandedWidth: false,
  showProgress: false,
  autoSaveBehavior: 'onChangePage',
  taskNavigation: [],
};

export function getUiConfig() {
  return window.altinnAppGlobalData.ui;
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
  const folders = getUiConfig().folders;
  return folderId ? folders[folderId] : undefined;
}

export function getDefaultDataTypeFromUiFolder(uiFolder: string | undefined) {
  return uiFolder ? getUiFolderSettings(uiFolder)?.defaultDataType : undefined;
}
