import React from 'react';
import type { ReactElement } from 'react';
import { Label, type LabelProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioLabelProps = WithoutAsChild<LabelProps>;

export function StudioLabel({ children, ...rest }: StudioLabelProps): ReactElement {
  return <Label {...rest}>{children}</Label>;
}
