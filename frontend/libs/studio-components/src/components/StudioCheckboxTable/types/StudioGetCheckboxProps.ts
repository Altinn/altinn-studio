import type { CheckboxProps } from '@digdir/designsystemet-react';

type GetCheckboxProps = Omit<
  CheckboxProps,
  | 'prefix'
  | 'role'
  | 'type'
  | 'size'
  | 'aria-label'
  | 'aria-labelledby'
  | 'label'
  | 'checked'
  | 'value'
> & {
  allowIndeterminate?: boolean;
  ref?: React.ForwardedRef<HTMLInputElement>;
  checked?: boolean;
  value?: string;
};

export type StudioGetCheckboxProps = GetCheckboxProps;
