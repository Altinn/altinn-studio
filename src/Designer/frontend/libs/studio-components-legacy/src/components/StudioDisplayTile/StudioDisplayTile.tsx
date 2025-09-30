import React, { forwardRef, type HTMLAttributes } from 'react';
import { PadlockLockedFillIcon } from '@studio/icons';
import cn from 'classnames';
import { Label, Paragraph } from '@digdir/designsystemet-react';
import classes from './StudioDisplayTile.module.css';

export type StudioDisplayTileProps = {
  icon?: React.ReactNode;
  label: string;
  value: string;
  showPadlock?: boolean;
} & HTMLAttributes<HTMLDivElement>;

/**
 * @deprecated Use `StudioDisplayTile` from `studio-components` instead.
 */
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
          <Label size='small' className={classes.label}>
            {icon}
            {label}
          </Label>
          <Paragraph size='small' className={classes.ellipsis}>
            {value}
          </Paragraph>
        </div>
        {showPadlock && <PadlockLockedFillIcon data-testid='padlockIconTestId' />}
      </div>
    );
  },
);

StudioDisplayTile.displayName = 'StudioDisplayTile';
export { StudioDisplayTile };
