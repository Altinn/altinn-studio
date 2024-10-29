export type CodeListItem<T extends string | boolean | number = string | boolean | number> = {
  description?: string;
  helpText?: string;
  label: string;
  value: T;
};
