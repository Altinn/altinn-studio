export interface Option {
  value: string;
  label: string;
}

export const getCombinationOptions = (__: (key: string) => string) => [
  {
    value: 'allOf',
    label: __('all_of'),
  },
  {
    value: 'anyOf',
    label: __('any_of'),
  },
  {
    value: 'oneOf',
    label: __('one_of'),
  },
];

export const getTypeOptions = (__: (key: string) => string) => [
  {
    value: 'string',
    label: __('string'),
  },
  {
    value: 'integer',
    label: __('integer'),
  },
  {
    value: 'number',
    label: __('number'),
  },
  {
    value: 'boolean',
    label: __('boolean'),
  },
  {
    value: 'object',
    label: __('object'),
  },
];
