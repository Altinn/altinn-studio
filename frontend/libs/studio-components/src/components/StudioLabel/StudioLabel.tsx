import React from 'react';
import type { ReactElement } from 'react';
import { Label, type LabelProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioLabelProps = WithoutAsChild<LabelProps>;

export function StudioLabel({
  children,
  'data-size': dataSize = 'sm',
  ...rest
}: StudioLabelProps): ReactElement {
  return (
    <Label {...rest} data-size={dataSize}>
      {children}
    </Label>
  );
}
