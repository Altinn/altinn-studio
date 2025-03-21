import React, { type ImgHTMLAttributes, type ReactElement } from 'react';
import classes from './StudioAvatar.module.css';
import cn from 'classnames';
import { PersonCircleIcon } from '@studio/icons';

export type StudioAvatarProps = ImgHTMLAttributes<HTMLImageElement>;

export const StudioAvatar = ({
  src,
  className: givenClass,
  ...rest
}: StudioAvatarProps): ReactElement => {
  const className = cn(givenClass, classes.avatar);

  return src ? (
    <img src={src} className={className} {...rest} />
  ) : (
    <PersonCircleIcon className={className} />
  );
};
