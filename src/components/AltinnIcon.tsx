import React from 'react';

import classNames from 'classnames';

export interface IAltinnIconComponentProvidedProps {
  iconClass: string;
  isActive?: boolean;
  isActiveIconColor?: string;
  iconColor: string;
  iconSize?: number | string;
  padding?: string;
  margin?: string;
  weight?: number;
}

export const AltinnIcon = ({
  iconClass,
  isActive,
  isActiveIconColor,
  iconColor,
  iconSize,
  padding,
  margin,
  weight,
}: IAltinnIconComponentProvidedProps) => (
  <i
    className={classNames(iconClass)}
    style={{
      color: isActive ? isActiveIconColor : iconColor,
      fontSize: iconSize,
      fontWeight: weight,
      margin,
      padding,
    }}
  />
);
