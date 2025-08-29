import React, { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { Label, type LabelProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioLabelAsParagraphProps = WithoutAsChild<LabelProps>;

function StudioLabelAsParagraph(
  { children, ...rest }: StudioLabelAsParagraphProps,
  ref: Ref<HTMLLabelElement>,
): ReactElement {
  return (
    <Label asChild {...rest} ref={ref}>
      <p>{children}</p>
    </Label>
  );
}

const ForwardedStudioLabelAsParagraph = forwardRef(StudioLabelAsParagraph);

export { ForwardedStudioLabelAsParagraph as StudioLabelAsParagraph };

StudioLabelAsParagraph.displayName = 'StudioLabelAsParagraph';
