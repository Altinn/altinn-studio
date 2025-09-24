import type { ComponentProps } from 'react';
import React, { forwardRef } from 'react';
import { StudioTable } from '../../StudioTable';

type RowProps = ComponentProps<typeof StudioTable.Row>;

export const Row = forwardRef<HTMLTableRowElement, RowProps>(({ children, ...rest }, ref) => (
  <StudioTable.Row ref={ref} {...rest}>
    {children}
  </StudioTable.Row>
));

Row.displayName = 'StudioInputTable.Row';
