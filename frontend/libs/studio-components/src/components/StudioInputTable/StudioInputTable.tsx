import React, { forwardRef, ReactNode } from 'react';
import { StudioTable } from '../StudioTable';

type StudioInputTableProps = {
  children: ReactNode;
};

export const StudioInputTable = forwardRef<HTMLTableElement, StudioInputTableProps>(
  ({ children }, ref) => {
    return <StudioTable ref={ref}>{children}</StudioTable>;
  },
);

StudioInputTable.displayName = 'StudioInputTable';
