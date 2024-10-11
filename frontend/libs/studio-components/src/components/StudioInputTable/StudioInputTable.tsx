import React, { forwardRef, useCallback } from 'react';
import type { StudioTableProps } from '../StudioTable';
import { StudioTable } from '../StudioTable';
import classes from './StudioInputTable.module.css';
import cn from 'classnames';
import { useForwardedRef } from '@studio/hooks';
import { activateTabbingOnFirstInputElement } from './dom-utils/activateTabbingOnFirstInputElement';

export type StudioInputTableProps = StudioTableProps;

export const StudioInputTable = forwardRef<HTMLTableElement, StudioInputTableProps>(
  ({ className: givenClass, children, ...rest }, ref) => {
    const className = cn(classes.inputTable, givenClass);
    const forwardedRef = useForwardedRef<HTMLTableElement>(ref);
    const internalRef = useCallback(
      (table: HTMLTableElement) => {
        activateTabbingOnFirstInputElement(table);
        forwardedRef.current = table;
      },
      [forwardedRef],
    );
    return (
      <StudioTable ref={internalRef} className={className} {...rest}>
        {children}
      </StudioTable>
    );
  },
);

StudioInputTable.displayName = 'StudioInputTable';
