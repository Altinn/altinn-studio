import { CombinationKind } from '@altinn/schema-model/index';

export interface Option {
  value: string;
  label: string;
}

export const getCombinationOptions = (t: (key: string) => string): Option[] => [
  {
    value: CombinationKind.AllOf,
    label: t('schema_editor.all_of'),
  },
  {
    value: CombinationKind.AnyOf,
    label: t('schema_editor.any_of'),
  },
  {
    value: CombinationKind.OneOf,
    label: t('schema_editor.one_of'),
  },
];
