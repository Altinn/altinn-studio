import React, { forwardRef } from 'react';
import { Label, type LabelProps } from '@digdir/designsystemet-react';

type StudioLabelAsParagraphProps = Omit<LabelProps, 'asChild'>;

export const StudioLabelAsParagraph = forwardRef<HTMLLabelElement, StudioLabelAsParagraphProps>(
  ({ children, ...rest }, ref) => {
    return (
      <Label asChild {...rest} ref={ref}>
        <p>{children}</p>
      </Label>
    );
  },
);

StudioLabelAsParagraph.displayName = 'StudioLabelAsParagraph';
