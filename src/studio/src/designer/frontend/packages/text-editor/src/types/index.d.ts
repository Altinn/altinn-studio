export type TextResourceFile = {
  language: LangCode;
  resources: TextResourceEntry[];
};

export type TextResourceEntry = {
  id: string;
  value: string;
  variables?: TextResourceVariable[];
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
