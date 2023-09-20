import React, { forwardRef, Ref } from 'react';
import type { IconImage } from './Icon';
import { Icon } from './Icon';
import cn from 'classnames';
import classes from './IconButton.module.css';

export interface IconButtonProps {
  ariaLabel?: string;
  className?: string;
  icon: IconImage;
  id?: string;
  onClick: () => void;
}

const IconButton = forwardRef(
  ({ ariaLabel, className, icon, id, onClick }: IconButtonProps, ref: Ref<HTMLButtonElement>) => (
    <button
      aria-label={ariaLabel}
      className={cn(classes.iconButton, className)}
      id={id}
      onClick={onClick}
      ref={ref}
    >
      <Icon image={icon} className={classes.icon} />
    </button>
  ),
);

IconButton.displayName = 'IconButton';
export { IconButton };
