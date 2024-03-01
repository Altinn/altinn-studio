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
        <KeyVerticalIcon data-testid='keyIcon' aria-hidden />
        {children}
      </span>
      <PencilIcon className={classes.editIcon} data-testid='editIcon' aria-hidden />
    </StudioButton>
  );
};
