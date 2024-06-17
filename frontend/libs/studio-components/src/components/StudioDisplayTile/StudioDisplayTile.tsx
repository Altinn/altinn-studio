import React, { forwardRef, type HTMLAttributes } from 'react';
import { PadlockLockedFillIcon } from '@studio/icons';
import cn from 'classnames';
import { Paragraph } from '@digdir/design-system-react';
import classes from './StudioDisplayTile.module.css';

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
      <div {...rest} className={className} ref={ref}>
        <div className={classes.innerContainer}>
          <div className={classes.iconLabelContainer}>
            {icon ?? null}
            <Paragraph size='small' className={classes.label}>
              {label}
            </Paragraph>
          </div>
          <Paragraph size='small'>{value}</Paragraph>
        </div>
        {showPadlock && <PadlockLockedFillIcon />}
      </div>
    );
  },
);

StudioDisplayTile.displayName = 'StudioDisplayTile';
export { StudioDisplayTile };
