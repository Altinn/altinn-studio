import React from 'react';
import { PencilIcon, KeyVerticalIcon } from '@studio/icons';
import { StudioButton, type StudioButtonProps } from '@studio/components';
import classes from './StudioTextfieldToggleView.module.css';
import cn from 'classnames';

export type StudioTextfieldToggleViewProps = StudioButtonProps & {
  label?: string;
};

export const StudioTextfieldToggleView = ({
  onClick,
  children,
  title,
  label,
  className: givenClass,
  icon = <KeyVerticalIcon data-testid='keyIcon' aria-hidden />,
  ...rest
}: StudioTextfieldToggleViewProps) => {
  const className = cn(classes.button, givenClass);

  return (
    <StudioButton className={className} onClick={onClick} {...rest}>
      <span className={classes.viewModeIconsContainer} title={title}>
        {icon}
        <span className={classes.textContainer}>
          {label && <span className={classes.label}>{label}</span>}
          <span className={classes.ellipsis}>{children}</span>
        </span>
      </span>
      <span className={classes.editIconWrapper}>
        <PencilIcon className={classes.editIcon} data-testid='editIcon' aria-hidden />
      </span>
    </StudioButton>
  );
};
