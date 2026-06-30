// Flat array so one hook can serve both v4 and v9 (the v9 ui-folders endpoint
// already returns a flat list). validationOnNavigation now has its own endpoint/query.
export type LayoutSets = LayoutSetConfig[];

export type LayoutSetConfig = {
  id: string;
  dataType?: string;
  taskId?: string;
  type?: LayoutSetType;
};

export type LayoutSetType = 'subform';
