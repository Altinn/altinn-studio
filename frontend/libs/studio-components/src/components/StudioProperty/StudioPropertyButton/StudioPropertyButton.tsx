import type { ReactNode } from 'react';
import React, { forwardRef } from 'react';
import type { StudioButtonProps } from '../../StudioButton';
import { StudioButton } from '../../StudioButton';
import classes from './StudioPropertyButton.module.css';
import { PlusCircleIcon, PencilIcon } from '@studio/icons';
import cn from 'classnames';

export type StudioPropertyButtonProps = {
  property: string;
  value?: ReactNode;
  compact?: boolean;
  withoutNegativeMargin?: boolean;
} & Omit<StudioButtonProps, 'children' | 'value'>;

const StudioPropertyButton = forwardRef<HTMLButtonElement, StudioPropertyButtonProps>(
  (
    {
      className: givenClass,
      compact,
      icon: givenIcon,
      property,
      value,
      withoutNegativeMargin,
      ...rest
    },
    ref,
  ) => {
    const hasValue = !!value;

    const icon = hasValue || givenIcon ? givenIcon : <PlusCircleIcon />;

    const className = cn(
      classes.propertyButton,
      hasValue && classes.withValue,
      compact && classes.compact,
      withoutNegativeMargin && classes.withoutNegativeMargin,
      givenClass,
    );

    return (
      <StudioButton
        aria-label={property}
        className={className}
        fullWidth
        icon={icon}
        ref={ref}
        size='small'
        title={property}
        variant='tertiary'
        {...rest}
      >
        <span className={classes.content}>
          <span className={classes.property}>{property}</span>
          <span className={classes.value}>{value}</span>
        </span>
        {hasValue && (
          <span className={classes.editIconWrapper}>
            <PencilIcon />
          </span>
        )}
      </StudioButton>
    );
  },
);

StudioPropertyButton.displayName = 'StudioProperty.Button';

export { StudioPropertyButton };
