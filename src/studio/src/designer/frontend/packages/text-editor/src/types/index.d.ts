export type Translations = Record<string, string>;

type Option = {
  value: string;
  label: string;
};

type LangName = string;
type LangCode = string;
type Language = {
  label?: LangName;
  value: LangCode;
};
