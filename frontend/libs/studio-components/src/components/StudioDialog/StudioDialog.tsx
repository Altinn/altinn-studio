import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { Dialog } from '@digdir/designsystemet-react';
import type { DialogProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';
import { TextWithIcon } from '../TextWithIcon';

export type StudioDialogProps = {
  triggerButtonText?: string;
  triggerButtonIcon?: ReactElement;
  triggerButtonIconPosition?: 'left' | 'right';
} & WithoutAsChild<DialogProps>;

export function StudioDialog({
  triggerButtonText,
  triggerButtonIcon,
  triggerButtonIconPosition = 'left',
  children,
  ...rest
}: StudioDialogProps): ReactElement {
  const [open, setOpen] = useState<boolean>(false);

  const handleClick = (): void => {
    setOpen((oldValue: boolean) => !oldValue);
  };

  return (
    <Dialog.TriggerContext>
      <Dialog.Trigger onClick={handleClick} icon={!triggerButtonText}>
        <TextWithIcon icon={triggerButtonIcon} iconPlacement={triggerButtonIconPosition}>
          {triggerButtonText}
        </TextWithIcon>
      </Dialog.Trigger>
      <Dialog onClose={() => setOpen(false)} open={open} {...rest}>
        {children}
      </Dialog>
    </Dialog.TriggerContext>
  );
}
