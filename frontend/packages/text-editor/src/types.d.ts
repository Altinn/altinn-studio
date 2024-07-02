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

type Option = {
  value: string;
  label: string;
};

type LangCode = string;

type TextTableRow = {
  textKey: string;
  variables?: TextResourceVariable[];
  translations: TextTableRowEntry[];
  usages?: any;
};

type TextTableRowEntry = {
  lang: LangCode;
  translation: string;
};
