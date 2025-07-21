import type { ReactNode } from 'react';
import React, { useCallback, forwardRef } from 'react';
import type { StudioButtonProps } from '../../StudioButton';
import { StudioButton } from '../../StudioButton';
import classes from './StudioPropertyButton.module.css';
import { PadlockLockedFillIcon, PlusCircleIcon, PencilIcon } from '@studio/icons';
import cn from 'classnames';
import { ValidationUtils } from '@studio/pure-functions';

export type StudioPropertyButtonProps = {
  property: string;
  value?: ReactNode;
  compact?: boolean;
  readOnly?: boolean;
  withoutNegativeMargin?: boolean;
} & Omit<StudioButtonProps, 'children' | 'value'>;

const StudioPropertyButton = forwardRef<HTMLButtonElement, StudioPropertyButtonProps>(
  (
    {
      className: givenClass,
      compact,
      readOnly,
      icon: givenIcon,
      onClick,
      property,
      value,
      withoutNegativeMargin,
      ...rest
    },
    ref,
  ) => {
    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
        if (!readOnly) onClick?.(event);
      },
      [onClick, readOnly],
    );

    const hasValue = ValidationUtils.valueExists(value);

    const icon = hasValue || givenIcon ? givenIcon : <PlusCircleIcon />;

    const className = cn(
      classes.propertyButton,
      hasValue && classes.withValue,
      compact && classes.compact,
      readOnly && classes.readOnly,
      withoutNegativeMargin && classes.withoutNegativeMargin,
      givenClass,
    );

    return (
      <StudioButton
        aria-label={property}
        aria-readonly={readOnly ? true : null}
        className={className}
        fullWidth
        onClick={handleClick}
        ref={ref}
        title={property}
        variant='tertiary'
        {...rest}
      >
        <span className={classes.content}>
          <span className={classes.property}>
            {icon}
            {property}
          </span>
          {hasValue && <span className={classes.value}>{value}</span>}
        </span>
        {readOnly ? (
          <span className={classes.readOnlyWrapper}>
            <PadlockLockedFillIcon />
          </span>
        ) : (
          hasValue && (
            <span className={classes.editIconWrapper}>
              <PencilIcon />
            </span>
          )
        )}
      </StudioButton>
    );
  },
);

StudioPropertyButton.displayName = 'StudioProperty.Button';

export { StudioPropertyButton };
