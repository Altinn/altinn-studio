// These types should ultimately be generated from the backend DTOs, but for now we define them manually here.
export type GlobalPageSettings = {
  hideCloseButton: NonNullable<boolean | undefined>;
  showLanguageSelector: NonNullable<boolean | undefined>;
  showExpandWidthButton: NonNullable<boolean | undefined>;
  expandedWidth: NonNullable<boolean | undefined>;
  showProgress: NonNullable<boolean | undefined>;
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

export type LayoutSet = {
  id: string;
  dataType: string;
  tasks?: string[];
};

export type LayoutSetsConfig = {
  sets: LayoutSet[];
  uiSettings: GlobalPageSettings;
};
