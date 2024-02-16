import React from 'react';
import { PencilIcon, KeyVerticalIcon } from '@studio/icons';
import { StudioButton, type StudioButtonProps } from '@studio/components';
import classes from './StudioTextfieldToggleView.module.css';

export type StudioTextfieldToggleViewProps = StudioButtonProps;

export const StudioTextfieldToggleView = ({
  onClick,
  children,
  ...rest
}: StudioTextfieldToggleViewProps) => {
  return (
    <StudioButton {...rest} onClick={onClick}>
      <span className={classes.viewModeIconsContainer}>
        <KeyVerticalIcon aria-hidden aria-label='keyIcon' />
        {children}
      </span>
      <PencilIcon aria-hidden className={classes.editIcon} aria-label='EditIcon' />
    </StudioButton>
  );
};
