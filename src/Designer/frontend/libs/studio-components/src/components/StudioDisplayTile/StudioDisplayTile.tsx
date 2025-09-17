import React, { forwardRef, type HTMLAttributes } from 'react';
import { PadlockLockedFillIcon } from '@studio/icons';
import { StudioParagraph } from '../StudioParagraph';
import { StudioLabel } from '../StudioLabel';
import classes from './StudioDisplayTile.module.css';
import cn from 'classnames';

export type StudioDisplayTileProps = {
  icon?: React.ReactNode;
  label: string;
  value: string;
  showPadlock?: boolean;
} & HTMLAttributes<HTMLDivElement>;

const StudioDisplayTile = forwardRef<HTMLDivElement, StudioDisplayTileProps>(
  (
    {
      icon,
      label,
      value,
      className: givenClassName,
      showPadlock = true,
      ...rest
    }: StudioDisplayTileProps,
    ref,
  ): React.ReactElement => {
    const className = cn(givenClassName, classes.container);

    return (
      <div {...rest} aria-label={label} className={className} ref={ref}>
        <div className={classes.ellipsis}>
          <StudioLabel data-size='sm' className={classes.label}>
            {icon}
            {label}
          </StudioLabel>
          <StudioParagraph data-size='sm' className={classes.ellipsis}>
            {value}
          </StudioParagraph>
        </div>
        {showPadlock && <PadlockLockedFillIcon data-testid='padlockIconTestId' />}
      </div>
    );
  },
);

StudioDisplayTile.displayName = 'StudioDisplayTile';
export { StudioDisplayTile };
