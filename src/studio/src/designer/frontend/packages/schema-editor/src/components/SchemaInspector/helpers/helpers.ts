export interface Option {
  value: string;
  label: string;
}

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
