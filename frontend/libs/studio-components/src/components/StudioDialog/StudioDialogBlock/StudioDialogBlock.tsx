import React from 'react';
import type { ReactElement } from 'react';
import { DialogBlock } from '@digdir/designsystemet-react';
import type { DialogBlockProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../../types/WithoutAsChild';

export type StudioDialogBlockProps = WithoutAsChild<DialogBlockProps>;

export function StudioDialogBlock({ children, ...rest }: StudioDialogBlockProps): ReactElement {
  return <DialogBlock {...rest}>{children}</DialogBlock>;
}

StudioDialogBlock.displayName = 'StudioDialog.Block';
