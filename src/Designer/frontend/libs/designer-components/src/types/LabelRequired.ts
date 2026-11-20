import type { Override } from './Override';

export type LabelRequired<Props> = Override<
  {
    label: string;
    'aria-label'?: never;
    'aria-labelledby'?: never;
  },
  Props
>;
