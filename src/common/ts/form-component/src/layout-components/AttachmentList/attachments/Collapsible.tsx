import type { PropsWithChildren } from 'react';

import cn from 'classnames';

import classes from './Collapsible.module.css';

export function Collapsible({ children, open }: PropsWithChildren<{ open: boolean }>) {
  return (
    <div
      className={cn(classes.collapsible, {
        [classes.collapsibleClosed]: !open,
      })}
    >
      {children}
    </div>
  );
}
