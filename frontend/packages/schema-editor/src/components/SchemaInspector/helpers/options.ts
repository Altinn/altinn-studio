import { CombinationKind } from '@altinn/schema-model';

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
