import React, { type HTMLAttributes } from 'react';
import classes from './StudioPageImageBackgroundContainer.module.css';

export type StudioPageImageBackgroundContainerProps = {
  image: string;
} & HTMLAttributes<HTMLDivElement>;

export const StudioPageImageBackgroundContainer = ({
  children,
  image,
}: StudioPageImageBackgroundContainerProps) => {
  return (
    <div className={classes.wrapper}>
      <div
        style={{
          backgroundImage: `url(${image})`,
        }}
        className={classes.pageContainer}
      >
        {children}
      </div>
    </div>
  );
};
