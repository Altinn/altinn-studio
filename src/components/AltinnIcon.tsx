import React from 'react';

import classNames from 'classnames';

export interface IAltinnIconCompontentProvidedProps {
  iconClass: string;
  isActive?: boolean;
  isActiveIconColor?: string;
  iconColor: any;
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
}: IAltinnIconCompontentProvidedProps) => {
  return (
    <i
      className={classNames(iconClass)}
      style={{
        color: isActive ? isActiveIconColor : iconColor,
        fontSize: iconSize,
        fontWeight: weight,
        margin: margin,
        padding: padding,
      }}
    />
  );
};

export default AltinnIcon;
