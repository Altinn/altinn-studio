import React from 'react';

import { DeleteWarningPopover as DeleteWarningPopoverLayout } from '@app/form-component';
import type { DeleteWarningPopoverProps } from '@app/form-component';

import { Lang } from 'src/features/language/Lang';

export type IDeleteWarningPopover = Omit<DeleteWarningPopoverProps, 'cancelButtonText'>;

export function DeleteWarningPopover(props: IDeleteWarningPopover) {
  return (
    <DeleteWarningPopoverLayout
      {...props}
      cancelButtonText={<Lang id='general.cancel' />}
    />
  );
}
