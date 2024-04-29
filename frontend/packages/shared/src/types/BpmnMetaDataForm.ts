export type TaskIdChange = {
  oldId: string;
  newId: string;
};

export type MetaDataForm = {
  taskIdChange?: TaskIdChange;
};
