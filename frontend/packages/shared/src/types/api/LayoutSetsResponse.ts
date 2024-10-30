export type LayoutSets = {
  sets: LayoutSetConfig[];
};

export type LayoutSet = {
  id: string;
  dataType?: string;
  tasks?: string[];
  type?: LayoutSetType;
};

export type LayoutSetConfig = LayoutSet;

export type LayoutSetType = 'subform';
