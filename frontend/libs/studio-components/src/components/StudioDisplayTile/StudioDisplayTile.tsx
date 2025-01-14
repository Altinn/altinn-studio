import React, { forwardRef, type HTMLAttributes } from 'react';
import { PadlockLockedFillIcon } from '@studio/icons';
import cn from 'classnames';
import { Paragraph } from '@digdir/designsystemet-react';
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
    const hasPrefixIcon = !!icon;
    const className = cn(givenClassName, classes.container, hasPrefixIcon && classes.prefixIcon);

    return (
      <div {...rest} className={className} ref={ref}>
        {icon}
        <div className={classes.ellipsis}>
          <Paragraph size='small' className={classes.label}>
            {label}
          </Paragraph>
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
