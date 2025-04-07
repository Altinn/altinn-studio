export type CodeListReference = {
  codeListId: string;
  codeListIdSources: CodeListIdSource[];
};

export type CodeListIdSource = {
  taskId: string;
  taskType: string;
  layoutSetId: string;
  layoutName: string;
  componentIds: string[];
};
