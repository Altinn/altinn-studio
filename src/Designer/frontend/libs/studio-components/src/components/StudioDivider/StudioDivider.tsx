import React, { forwardRef } from 'react';
import type { ReactElement } from 'react';
import { Divider, type DividerProps } from '@digdir/designsystemet-react';

export type StudioDividerProps = DividerProps;

function StudioDivider(
  { ...rest }: StudioDividerProps,
  ref: React.Ref<HTMLHRElement>,
): ReactElement {
  return <Divider ref={ref} {...rest} />;
}

const ForwardedStudioDivider = forwardRef(StudioDivider);

export { ForwardedStudioDivider as StudioDivider };
