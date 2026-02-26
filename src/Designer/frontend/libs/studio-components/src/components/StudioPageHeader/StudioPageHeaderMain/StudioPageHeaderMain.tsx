import React, { type ReactNode, type ReactElement } from 'react';
import classes from './StudioPageHeaderMain.module.css';
import cn from 'classnames';
import { useStudioPageHeaderContext } from '../context';

export type StudioPageHeaderMainProps = {
  children: ReactNode;
};

export const StudioPageHeaderMain = ({ children }: StudioPageHeaderMainProps): ReactElement => {
  const { variant } = useStudioPageHeaderContext();
  return <div className={cn(classes.main, classes[variant || 'regular'])}>{children}</div>;
};
