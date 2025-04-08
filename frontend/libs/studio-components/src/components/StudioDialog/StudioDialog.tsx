import React, { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { Dialog } from '@digdir/designsystemet-react';
import type { DialogProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioDialogProps = WithoutAsChild<DialogProps>;

function StudioDialog(
  { children, ...rest }: StudioDialogProps,
  ref: Ref<HTMLDialogElement>,
): ReactElement {
  return (
    <Dialog ref={ref} {...rest}>
      {children}
    </Dialog>
  );
}

// Because the rest of our solution runs on React 18, we need to use the new forwardRef API until we have updated the rest of the solution to React 19.
const ForwardedStudioDialog = forwardRef(StudioDialog);

export { ForwardedStudioDialog as StudioDialog };
