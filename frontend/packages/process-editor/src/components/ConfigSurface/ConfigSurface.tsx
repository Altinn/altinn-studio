import React from 'react';
import cn from 'classnames';
import classes from './ConfigSurface.module.css';

type ConfigSurfaceProps = {
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;
export const ConfigSurface = ({ children, ...rest }: ConfigSurfaceProps): React.ReactElement => {
  const className = cn(classes.surface, rest.className);
  return (
    <div {...rest} className={className}>
      {children}
    </div>
  );
};
