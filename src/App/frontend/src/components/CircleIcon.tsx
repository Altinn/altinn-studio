import React from 'react';

import cn from 'classnames';

import classes from 'src/components/CircleIcon.module.css';

type Props = Omit<React.HTMLProps<HTMLDivElement>, 'size' | 'color'> & {
  size: string | number;
  color?: string;
};

export function CircleIcon({ children, className, color, size, ...rest }: Props) {
  const style = {
    '--icon-size': size,
    ...(color && { backgroundColor: color }),
  };

  return (
    <div
      className={cn(classes.circle, className)}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}
