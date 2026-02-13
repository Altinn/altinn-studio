// These types should ultimately be generated from the backend DTOs, but for now we define them manually here.
import type { ILayoutSettings } from 'src/layout/common.generated';

export type GlobalPageSettings = {
  hideCloseButton: boolean;
  showLanguageSelector: boolean;
  showExpandWidthButton: boolean;
  expandedWidth: boolean;
  showProgress: boolean;
  autoSaveBehavior: 'onChangeFormData' | 'onChangePage';
  taskNavigation: (NavigationTask | NavigationReceipt)[];
};

export type NavigationReceipt = {
  id: string;
  name?: string;
  type: 'receipt';
};

export type NavigationTask = {
  id: string;
  name?: string;
  taskId: string;
};

export type UiFolders = Record<string, ILayoutSettings>;

export type UiSettings = {
  folders: UiFolders;
  settings?: Partial<GlobalPageSettings>;
};
