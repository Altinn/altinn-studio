export type TaskIdChange = {
  oldId: string;
  newId: string;
};

export type MetadataForm = {
  taskIdChange?: TaskIdChange;
};
