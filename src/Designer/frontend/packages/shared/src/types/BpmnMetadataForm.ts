export type TaskIdChange = {
  oldId: string;
  newId: string;
};

/** A subform PDF task that named a Subform component now names its subform's UI folder. */
export type SubformPdfConfigUpgrade = {
  taskId: string;
  subformComponentId: string;
};

export type MetadataForm = {
  taskIdChange?: TaskIdChange;
  subformPdfConfigUpgrade?: SubformPdfConfigUpgrade;
};
