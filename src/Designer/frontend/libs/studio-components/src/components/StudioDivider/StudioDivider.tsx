import React, { forwardRef } from 'react';
import type { HTMLAttributes, ReactElement } from 'react';
import { Divider } from '@digdir/designsystemet-react';

export type StudioDividerProps = HTMLAttributes<HTMLHRElement>;

function StudioDivider(
  { ...rest }: StudioDividerProps,
  ref: React.Ref<HTMLHRElement>,
): ReactElement {
  return <Divider ref={ref} {...rest} />;
}

const ForwardedStudioDivider = forwardRef(StudioDivider);

export { ForwardedStudioDivider as StudioDivider };
