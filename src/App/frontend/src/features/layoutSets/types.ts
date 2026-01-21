import type { GlobalPageSettings as GlobalPageSettingsFromSchema } from 'src/layout/common.generated';

export type GlobalPageSettings = Required<GlobalPageSettingsFromSchema>;

export type LayoutSet = {
  id: string;
  dataType: string;
  tasks?: string[];
};

export type LayoutSetsConfig = {
  sets: LayoutSet[];
  uiSettings: GlobalPageSettings;
};
