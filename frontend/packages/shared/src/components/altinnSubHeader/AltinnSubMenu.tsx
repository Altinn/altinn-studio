import classes from './AltinnSubMenu.module.css';
import React from 'react';
import type { AltinnHeaderVariant } from '../altinnHeader/types';
import classnames from 'classnames';

export interface AltinnSubMenuProps {
  variant: AltinnHeaderVariant;
  children?: JSX.Element;
}

export const AltinnSubMenu = ({ variant, children }: AltinnSubMenuProps) => {
  return (
    <div>
      <div className={classnames(classes.subToolbar, classes[variant])}>{children}</div>
    </div>
  );
};
