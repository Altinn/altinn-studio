import React, { type ImgHTMLAttributes, type ReactElement } from 'react';
import classes from './StudioAvatar.module.css';
import cn from 'classnames';
import { PersonCircleIcon } from '@studio/icons';

export type StudioAvatarProps = {
  avatarElement?: ImgHTMLAttributes<HTMLImageElement>;
};

export const StudioAvatar = ({ avatarElement }: StudioAvatarProps): ReactElement => {
  if (!avatarElement) {
    return <PersonCircleIcon className={classes.avatar} />;
  }
  return <img {...avatarElement} className={cn(avatarElement.className, classes.avatar)} />;
};
