export type TextResourceIdMutation = {
  oldId: string;
  newId?: string;
};
export type TextResourceEntryDeletion = {
  textId: string;
};

export type TextResourceVariable = {
  key: string;
  dataSource: string;
  defaultValue?: string;
};

type LangCode = string;
