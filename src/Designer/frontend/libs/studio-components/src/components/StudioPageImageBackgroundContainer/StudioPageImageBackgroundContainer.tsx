import React, { type HTMLAttributes, type ReactElement } from 'react';
import classes from './StudioPageImageBackgroundContainer.module.css';

export type StudioPageImageBackgroundContainerProps = {
  image: string;
} & HTMLAttributes<HTMLDivElement>;

export const StudioPageImageBackgroundContainer = ({
  children,
  image,
  className,
  ...rest
}: StudioPageImageBackgroundContainerProps): ReactElement => {
  return (
    <div className={`${classes.wrapper} ${className ?? ''}`} {...rest}>
      <div style={{ backgroundImage: `url(${image})` }} className={classes.pageContainer}>
        {children}
      </div>
    </div>
  );
};
