/** A Subform component on the pages of a ui folder, and the subform it opens. */
export type SubformComponent = {
  componentId: string;
  layoutSetId: string;
  layoutName: string;
  taskType?: string;
  /** Null when the component has no `layoutSet`. */
  subformLayoutSetId: string | null;
  /** Null when the subform folder is missing or has no default data type. */
  subformDataTypeId: string | null;
};
