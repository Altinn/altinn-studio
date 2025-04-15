import React from 'react';
import type { ReactNode, ReactElement } from 'react';
import { DialogTrigger } from '@digdir/designsystemet-react';
import type { DialogTriggerProps } from '@digdir/designsystemet-react';
import { TextWithIcon } from '../../TextWithIcon';

export type StudioDialogTriggerProps = {
  icon?: ReactNode;
  iconPlacement?: 'left' | 'right';
} & Omit<DialogTriggerProps, 'asChild' | 'icon'>;

export function StudioDialogTrigger({
  icon,
  iconPlacement = 'left',
  children,
  ...rest
}: StudioDialogTriggerProps): ReactElement {
  return (
    <DialogTrigger {...rest}>
      <TextWithIcon icon={icon} iconPlacement={iconPlacement}>
        {children}
      </TextWithIcon>
    </DialogTrigger>
  );
}

StudioDialogTrigger.displayName = 'StudioDialog.Trigger';
