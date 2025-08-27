import React from 'react';
import type { ReactElement } from 'react';
import { DialogTriggerContext } from '@digdir/designsystemet-react';
import type { DialogTriggerContextProps } from '@digdir/designsystemet-react';

export type StudioDialogTriggerContextProps = DialogTriggerContextProps;

export function StudioDialogTriggerContext({
  children,
  ...rest
}: StudioDialogTriggerContextProps): ReactElement {
  return <DialogTriggerContext {...rest}>{children}</DialogTriggerContext>;
}

StudioDialogTriggerContext.displayName = 'StudioDialog.TriggerContext';
