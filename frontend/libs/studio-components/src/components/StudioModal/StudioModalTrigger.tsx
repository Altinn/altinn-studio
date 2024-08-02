import React, { forwardRef } from 'react';
import { StudioButton, StudioButtonProps } from '../StudioButton';
import { Modal } from '@digdir/designsystemet-react';

export type StudioModalTriggerProps = StudioButtonProps;

export const StudioModalTrigger = forwardRef<HTMLButtonElement, StudioModalTriggerProps>(
  ({ children, ...rest }, ref) => (
    <Modal.Trigger asChild>
      <StudioButton {...rest} ref={ref}>
        {children}
      </StudioButton>
    </Modal.Trigger>
  ),
);
