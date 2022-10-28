import React from 'react';
import { Icon, IconImage } from './Icon';
import cn from 'classnames';
import classes from './IconButton.module.css';

export interface IconButtonProps {
  ariaLabel?: string;
  className?: string;
  icon: IconImage;
  id?: string;
  onClick: () => void;
}

export const IconButton = ({
  ariaLabel,
  className,
  icon,
  id,
  onClick,
}: IconButtonProps) => (
  <button
    aria-label={ariaLabel}
    className={cn(classes.iconButton, className)}
    id={id}
    onClick={onClick}
  >
    <Icon image={icon} className={classes.icon} />
  </button>
);
