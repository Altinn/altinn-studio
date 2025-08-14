import React, { forwardRef, type MouseEvent } from 'react';
import { CheckmarkIcon } from '@studio/icons';
import { StudioButton, type StudioButtonProps } from '@studio/components';

export type StudioActionCloseButtonProps = StudioButtonProps & {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

export const StudioActionCloseButton = forwardRef<HTMLButtonElement, StudioActionCloseButtonProps>(
  ({ onClick, variant = 'secondary', ...rest }: StudioActionCloseButtonProps, ref) => {
    const handleOnClick = (event: MouseEvent<HTMLButtonElement>): void => onClick(event);
    return (
      <StudioButton
        data-color='success'
        icon={<CheckmarkIcon />}
        onClick={handleOnClick}
        variant={variant}
        {...rest}
        ref={ref}
      />
    );
  },
);

StudioActionCloseButton.displayName = 'StudioActionCloseButton';
