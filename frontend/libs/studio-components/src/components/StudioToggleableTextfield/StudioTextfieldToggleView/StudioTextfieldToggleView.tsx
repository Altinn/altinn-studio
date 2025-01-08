import React from 'react';
import { PencilIcon } from '@studio/icons';
import { StudioButton, type StudioButtonProps } from '@studio/components';
import classes from './StudioTextfieldToggleView.module.css';
import cn from 'classnames';

export type StudioTextfieldToggleViewProps = Omit<StudioButtonProps, 'icon'> & {
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label?: string;
};

export const StudioTextfieldToggleView = ({
  onClick,
  label,
  className: givenClass,
  Icon,
  ...rest
}: StudioTextfieldToggleViewProps) => {
  const className = cn(classes.button, givenClass);

  return (
    <StudioButton variant='tertiary' className={className} onClick={onClick} {...rest}>
      <span className={classes.viewModeIconsContainer}>
        <Icon aria-hidden />
        <span className={classes.textContainer}>
          {label && (
            <span className={classes.label} aria-hidden>
              {label}
            </span>
          )}
          <span className={classes.ellipsis}>{rest.value}</span>
        </span>
      </span>
      <PencilIcon className={classes.editIcon} aria-hidden />
    </StudioButton>
  );
};
