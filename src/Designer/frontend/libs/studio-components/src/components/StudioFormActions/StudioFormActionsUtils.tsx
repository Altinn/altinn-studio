import React from 'react';
import { StudioSaveIcon, StudioCancelIcon, StudioEditIcon, StudioDeleteIcon } from '@studio/icons';

export enum PrimaryActionMode {
  Save = 'save',
  Edit = 'edit',
}

export enum SecondaryActionMode {
  Cancel = 'cancel',
  Delete = 'delete',
}

export const primaryConfig = {
  [PrimaryActionMode.Save]: {
    icon: <StudioSaveIcon />,
    variant: 'primary' as const,
    color: undefined,
  },
  [PrimaryActionMode.Edit]: {
    icon: <StudioEditIcon />,
    variant: 'primary' as const,
    color: undefined,
  },
};

export const secondaryConfig = {
  [SecondaryActionMode.Cancel]: {
    icon: <StudioCancelIcon />,
    variant: 'secondary' as const,
    color: undefined,
  },
  [SecondaryActionMode.Delete]: {
    icon: <StudioDeleteIcon />,
    variant: 'secondary' as const,
    color: 'danger',
  },
};
