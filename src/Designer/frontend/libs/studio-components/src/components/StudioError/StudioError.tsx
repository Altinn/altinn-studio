import React, { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { StudioAlert } from '../StudioAlert';
import type { StudioAlertProps } from '../StudioAlert';

export type StudioErrorProps = Omit<StudioAlertProps, 'data-color'>;

function StudioError(
  { children, ...rest }: StudioErrorProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  return (
    <StudioAlert {...rest} data-color='danger' ref={ref}>
      {children}
    </StudioAlert>
  );
}

const ForwardedStudioError = forwardRef(StudioError);

export { ForwardedStudioError as StudioError };
