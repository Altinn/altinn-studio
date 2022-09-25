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
    label: t('string'),
  },
  {
    value: FieldType.Integer,
    label: t('integer'),
  },
  {
    value: FieldType.Number,
    label: t('number'),
  },
  {
    value: FieldType.Boolean,
    label: t('boolean'),
  },
  {
    value: FieldType.Object,
    label: t('object'),
  },
  {
    value: FieldType.Array,
    label: t('array'),
  },
];
