import React, { forwardRef, type MouseEvent } from 'react';
import { CheckmarkIcon } from '../../../../studio-icons';
import { StudioButton, type StudioButtonProps } from '../StudioButton';

export type StudioActionCloseButtonProps = StudioButtonProps & {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

const StudioActionCloseButton = (
  { onClick, variant = 'secondary', ...rest }: StudioActionCloseButtonProps,
  ref: React.Ref<HTMLButtonElement>,
): React.ReactElement => {
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
};

StudioActionCloseButton.displayName = 'StudioActionCloseButton';

export const StudioActionCloseButtonForwarded = forwardRef<
  HTMLButtonElement,
  StudioActionCloseButtonProps
>(StudioActionCloseButton);

export { StudioActionCloseButtonForwarded as StudioActionCloseButton };
