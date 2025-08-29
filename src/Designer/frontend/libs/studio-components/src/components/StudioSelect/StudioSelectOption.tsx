import React from 'react';
import type { ReactElement } from 'react';
import { SelectOption } from '@digdir/designsystemet-react';
import type { SelectOptionProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioSelectOptionProps = WithoutAsChild<SelectOptionProps>;

export function StudioSelectOption({ children, ...rest }: StudioSelectOptionProps): ReactElement {
  return <SelectOption {...rest}>{children}</SelectOption>;
}

StudioSelectOption.displayName = 'StudioSelect.Option';
