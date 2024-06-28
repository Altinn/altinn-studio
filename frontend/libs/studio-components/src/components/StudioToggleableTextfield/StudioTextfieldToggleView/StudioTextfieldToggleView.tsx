import React from 'react';
import { PencilIcon, KeyVerticalIcon } from '@studio/icons';
import { StudioButton, type StudioButtonProps } from '@studio/components';
import classes from './StudioTextfieldToggleView.module.css';
import cn from 'classnames';

export type StudioTextfieldToggleViewProps = StudioButtonProps;

export const StudioTextfieldToggleView = ({
  onClick,
  children,
  className: givenClass,
  ...rest
}: StudioTextfieldToggleViewProps) => {
  const className = cn(classes.button, givenClass);

  return (
    <StudioButton className={className} onClick={onClick} {...rest}>
      <span className={classes.viewModeIconsContainer}>
        <KeyVerticalIcon data-testid='keyIcon' aria-hidden />
        <div className={classes.componentIdInViewMode}> {children}</div>
      </span>
      <span className={classes.editIconWrapper}>
        <PencilIcon className={classes.editIcon} data-testid='editIcon' aria-hidden />
      </span>
    </StudioButton>
  );
};
