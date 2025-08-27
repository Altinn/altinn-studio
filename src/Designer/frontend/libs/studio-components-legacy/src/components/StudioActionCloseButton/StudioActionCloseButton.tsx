import React, { forwardRef, type MouseEvent } from 'react';
import { CheckmarkIcon } from '../../../../studio-icons';
import { StudioButton, type StudioButtonProps } from '../StudioButton';
import type { OverridableComponent } from '../../types/OverridableComponent';

export type StudioActionCloseButtonProps = StudioButtonProps & {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};
/**
 * @deprecated use `StudioActionCloseButton` from `@studio/components` instead.
 */
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
