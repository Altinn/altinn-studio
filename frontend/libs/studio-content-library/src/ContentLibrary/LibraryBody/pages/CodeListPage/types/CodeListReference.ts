export type CodeListReference = {
  codeListId: string;
  codeListIdSources: CodeListIdSource[];
};

export type CodeListIdSource = {
  layoutSetId: string;
  layoutName: string;
  componentIds: string[];
};
