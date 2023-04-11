import { CombinationKind, FieldType } from '@altinn/schema-model';

export interface Option {
  value: string;
  label: string;
}

export const getCombinationOptions = (t: (key: string) => string): Option[] => [
  {
    value: CombinationKind.AllOf,
    label: t('all_of'),
  },
  {
    value: CombinationKind.AnyOf,
    label: t('any_of'),
  },
  {
    value: CombinationKind.OneOf,
    label: t('one_of'),
  },
];

export const getTypeOptions = (t: (key: string) => string): Option[] => [
  {
    value: FieldType.String,
    label: t('schema_editor.string'),
  },
  {
    value: FieldType.Integer,
    label: t('schema_editor.integer'),
  },
  {
    value: FieldType.Number,
    label: t('schema_editor.number'),
  },
  {
    value: FieldType.Boolean,
    label: t('schema_editor.boolean'),
  },
  {
    value: FieldType.Object,
    label: t('schema_editor.object'),
  },
];
