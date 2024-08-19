import React, { type ReactElement } from 'react';
import classes from './StudioAvatar.module.css';
import { PersonCircleIcon } from '@studio/icons';

type ImageDetails = {
  src: string;
  alt: string;
  title: string;
};

export type StudioAvatarProps = {
  imageDetails?: ImageDetails;
};

export const StudioAvatar = ({ imageDetails }: StudioAvatarProps): ReactElement => {
  if (!imageDetails) {
    return <PersonCircleIcon className={classes.avatar} />;
  }
  return (
    <img
      alt={imageDetails.alt}
      title={imageDetails.title}
      className={classes.avatar}
      src={imageDetails.src}
    />
  );
};
