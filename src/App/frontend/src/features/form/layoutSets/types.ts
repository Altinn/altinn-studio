// These types should ultimately be generated from the backend DTOs, but for now we define them manually here.
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

export type ILayoutSet = {
  id: string;
  dataType: string;
  tasks?: string[];
};

export type ILayoutSets = {
  sets: ILayoutSet[];
  uiSettings: GlobalPageSettings;
};
