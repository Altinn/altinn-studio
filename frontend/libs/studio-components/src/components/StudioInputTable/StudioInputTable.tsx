import React, { forwardRef } from 'react';
import type { StudioTableProps } from '../StudioTable';
import { StudioTable } from '../StudioTable';
import classes from './StudioInputTable.module.css';
import cn from 'classnames';

export type StudioInputTableProps = StudioTableProps;

export const StudioInputTable = forwardRef<HTMLTableElement, StudioInputTableProps>(
  ({ className: givenClass, children, ...rest }, ref) => {
    const className = cn(classes.inputTable, givenClass);
    return (
      <StudioTable ref={ref} className={className} {...rest}>
        {children}
      </StudioTable>
    );
  },
);

StudioInputTable.displayName = 'StudioInputTable';
