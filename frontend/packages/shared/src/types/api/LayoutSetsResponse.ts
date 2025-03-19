export type LayoutSets = {
  sets: LayoutSetConfig[];
  uiSettings: UiSettingsConfig;
};

export type LayoutSet = {
  id: string;
  dataType?: string;
  tasks?: string[];
  type?: LayoutSetType;
};

export type LayoutSetType = 'subform';

export type LayoutSetConfig = LayoutSet;

export type UiSettingsConfig = {
  taskNavigation: NavigationTask[] | NavigationReceipt[];
};

type NavigationBase = {
  name?: string;
};

export type NavigationTask = NavigationBase & {
  taskId: string;
};

export type NavigationReceipt = NavigationBase & {
  type: string;
};
