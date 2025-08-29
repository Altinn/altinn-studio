import React, { forwardRef, useCallback } from 'react';
import type { StudioTableProps } from '../StudioTable';
import { StudioTable } from '../StudioTable';
import classes from './StudioInputTable.module.css';
import cn from 'classnames';
import { useForwardedRef } from '@studio/hooks';
import type { StudioInputTableContextValue } from './StudioInputTableContext';
import { StudioInputTableContext } from './StudioInputTableContext';

export type StudioInputTableProps = StudioTableProps & StudioInputTableContextValue;

export const StudioInputTable = forwardRef<HTMLTableElement, StudioInputTableProps>(
  ({ onChangeAny, onFocusAny, onBlurAny, className: givenClass, children, ...rest }, ref) => {
    const className = cn(classes.inputTable, givenClass);
    const forwardedRef = useForwardedRef<HTMLTableElement>(ref);
    const internalRef = useCallback(
      (table: HTMLTableElement) => {
        forwardedRef.current = table;
      },
      [forwardedRef],
    );
    return (
      <StudioInputTableContext.Provider value={{ onChangeAny, onBlurAny, onFocusAny }}>
        <StudioTable ref={internalRef} className={className} {...rest}>
          {children}
        </StudioTable>
      </StudioInputTableContext.Provider>
    );
  },
);

StudioInputTable.displayName = 'StudioInputTable';
