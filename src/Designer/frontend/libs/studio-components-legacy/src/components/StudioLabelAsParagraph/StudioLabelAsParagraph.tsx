import React, { forwardRef } from 'react';
import { Label, type LabelProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

type StudioLabelAsParagraphProps = WithoutAsChild<LabelProps>;

/**
 * @deprecated use `StudioLabelAsParagraph` from `@studio/components` instead.
 */
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
