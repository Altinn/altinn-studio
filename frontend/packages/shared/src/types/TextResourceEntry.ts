export interface TextResourceDetails {
  value: string;
  variables?: TextResourceVariable[];
}

export type TextResourceVariable = {
  key: string;
  dataSource: string;
};

export interface TextResourceEntry extends TextResourceDetails {
  id: string;
}
