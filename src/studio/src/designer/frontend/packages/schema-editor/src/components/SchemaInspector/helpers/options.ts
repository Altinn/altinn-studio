export interface Option {
  value: string;
  label: string;
}

export const getCombinationOptions = (t: (key: string) => string): Option[] => [
  {
    value: 'allOf',
    label: t('all_of'),
  },
  {
    value: 'anyOf',
    label: t('any_of'),
  },
  {
    value: 'oneOf',
    label: t('one_of'),
  },
];

export const getTypeOptions = (t: (key: string) => string): Option[] => [
  {
    value: 'string',
    label: t('string'),
  },
  {
    value: 'integer',
    label: t('integer'),
  },
  {
    value: 'number',
    label: t('number'),
  },
  {
    value: 'boolean',
    label: t('boolean'),
  },
  {
    value: 'object',
    label: t('object'),
  },
];
