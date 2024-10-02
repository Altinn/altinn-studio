export type LayoutSets = {
  sets: LayoutSetConfig[];
};

export type LayoutSet = {
  id: string;
  dataType?: string;
  tasks?: string[];
  type?: string;
};

export type LayoutSetConfig = LayoutSet;
