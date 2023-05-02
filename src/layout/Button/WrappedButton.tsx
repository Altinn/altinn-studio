import React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';

import { ButtonLoader } from 'src/layout/Button/ButtonLoader';
import type { ButtonLoaderProps } from 'src/layout/Button/ButtonLoader';

export interface BaseButtonProps {
  onClick: (...args) => void;
  busyWithId?: string;
  disabled?: boolean;
}

export interface ButtonProps extends ButtonLoaderProps, BaseButtonProps {
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
  language,
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
      variant={variant}
      color={color}
      onClick={handleClick}
      id={id}
      disabled={disabled}
    >
      {children}
      {thisIsLoading && <ButtonLoader language={language} />}
    </Button>
  );
};
