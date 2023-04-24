export type TextResourceFile = {
  language: LangCode;
  resources: TextResourceEntry[];
};

export type TextDetail = {
  value: string;
  variables?: TextResourceVariable[];
};
export type TextResourceIdMutation = {
  oldId: string;
  newId?: string;
};
export type TextResourceEntryDeletion = {
  textId: string;
};
export type TextResourceEntry = {
  id: string;
} & TextDetail;
export type TextResourceMap = {
  [id: string]: TextDetail;
};
export type TextResourceVariable = {
  key: string;
  dataSource: string;
};

type Option = {
  value: string;
  label: string;
};

type LangCode = string;

type Language = {
  label?: string;
  value: LangCode;
};

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

export interface UpsertTextResourceMutation {
  textId: string;
  language: string;
  translation: string;
}
