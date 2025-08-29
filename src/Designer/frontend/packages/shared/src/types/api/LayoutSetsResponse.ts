export type LayoutSets = {
  sets: LayoutSetConfig[];
};

export type LayoutSet = {
  id: string;
  dataType?: string;
  tasks?: string[];
  type?: LayoutSetType;
};

export type LayoutSetType = 'subform';

export type LayoutSetConfig = LayoutSet;
