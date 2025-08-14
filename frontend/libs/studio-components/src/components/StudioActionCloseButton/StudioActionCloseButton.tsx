import React, { forwardRef, type MouseEvent } from 'react';
import { CheckmarkIcon } from '@studio/icons';
import { StudioButton, type StudioButtonProps } from '../StudioButton';

export type StudioActionCloseButtonProps = StudioButtonProps & {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

export const StudioActionCloseButton = forwardRef<HTMLButtonElement, StudioActionCloseButtonProps>(
  ({ onClick, variant = 'secondary', ...rest }: StudioActionCloseButtonProps, ref) => {
    return (
      <StudioButton
        data-color='success'
        icon={<CheckmarkIcon />}
        onClick={onClick}
        variant={variant}
        {...rest}
        ref={ref}
      />
    );
  },
);

StudioActionCloseButton.displayName = 'StudioActionCloseButton';
