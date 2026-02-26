import React, { type ReactNode, type ReactElement } from 'react';
import classes from './StudioPageHeaderSub.module.css';
import { useStudioPageHeaderContext } from '../context';

export type StudioPageHeaderSubProps = {
  children?: ReactNode;
};

export const StudioPageHeaderSub = ({ children }: StudioPageHeaderSubProps): ReactElement => {
  const { variant } = useStudioPageHeaderContext();

  return <div className={classes[`${variant}Sub`]}>{children}</div>;
};
