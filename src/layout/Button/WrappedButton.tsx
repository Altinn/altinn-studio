import React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';

import { ButtonLoader } from 'src/layout/Button/ButtonLoader';

export interface BaseButtonProps {
  onClick: (...args) => void;
  busyWithId?: string | null;
  disabled?: boolean;
}

export interface ButtonProps extends BaseButtonProps {
  id: string;
  children: React.ReactNode;
}

interface Props extends ButtonProps {
  variant?: ButtonVariant;
  color?: ButtonColor;
}

export const WrappedButton = ({
  variant = ButtonVariant.Outline,
  color = ButtonColor.Primary,
  onClick,
  id,
  children,
  busyWithId,
  disabled,
}: Props) => {
  const somethingIsLoading = !!busyWithId;
  const thisIsLoading = busyWithId === id;
  const handleClick = async (...args) => {
    if (!somethingIsLoading) {
      onClick(args);
    }
  };
  return (
    <Button
      data-is-loading={thisIsLoading ? 'true' : 'false'}
      variant={variant}
      color={color}
      onClick={handleClick}
      id={id}
      disabled={disabled || thisIsLoading}
    >
      {children}
      {thisIsLoading && <ButtonLoader />}
    </Button>
  );
};
