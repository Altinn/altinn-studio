import React, { forwardRef, type MouseEvent } from 'react';
import { CheckmarkIcon } from '@studio/icons';
import { StudioButton, type StudioButtonProps } from '../StudioButton';
import type { OverridableComponent } from '../../types/OverridableComponent';

export type StudioActionCloseButtonProps = StudioButtonProps & {
  /**
   * @deprecated use `StudioActionCloseButton` from `@studio/components` instead.
   */
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

export const StudioActionCloseButton: OverridableComponent<
  StudioActionCloseButtonProps,
  HTMLButtonElement
> = forwardRef<HTMLButtonElement, StudioActionCloseButtonProps>(
  ({ onClick, variant = 'secondary', ...rest }: StudioActionCloseButtonProps, ref) => {
    const handleOnClick = (event: MouseEvent<HTMLButtonElement>): void => {
      onClick(event);
    };

    return (
      <StudioButton
        color='success'
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
