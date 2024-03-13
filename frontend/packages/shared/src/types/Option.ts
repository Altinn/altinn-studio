export type Option<T extends string | boolean | number = string | boolean | number> = {
  label: string;
  value: T;
  description?: string;
  helpText?: string;
};
