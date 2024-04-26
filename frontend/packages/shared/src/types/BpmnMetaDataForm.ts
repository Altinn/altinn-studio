export type MetaDataForm = {
  taskIdChanges?: Array<{
    oldId: string;
    newId: string;
  }>;
  dataTypeChangeDetails?: {
    newDataType: string;
    connectedTaskId: string;
  };
};
