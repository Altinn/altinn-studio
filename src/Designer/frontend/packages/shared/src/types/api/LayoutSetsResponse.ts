export type LayoutSets = {
  sets: LayoutSetConfig[];
  validationOnNavigation?: ValidationOnNavigation;
};

export type LayoutSet = {
  id: string;
  dataType?: string;
  tasks?: string[];
  type?: LayoutSetType;
};

export type LayoutSetType = 'subform';

export type LayoutSetConfig = LayoutSet;

export type ValidationOnNavigation = {
  show: string[];
  page: string;
};
