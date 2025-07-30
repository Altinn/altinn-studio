import type { RadioProps } from '@digdir/designsystemet-react';

type GetRadioProps = Omit<
  RadioProps,
  | 'prefix'
  | 'role'
  | 'type'
  | 'size'
  | 'aria-label'
  | 'aria-labelledby'
  | 'label'
  | 'name'
  | 'checked'
  | 'value'
> & {
  ref?: React.ForwardedRef<HTMLInputElement>;
  value?: string;
};

export type StudioGetRadioProps = GetRadioProps;
