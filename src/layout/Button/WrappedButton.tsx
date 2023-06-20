import React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';

import { ButtonLoader } from 'src/layout/Button/ButtonLoader';
import classes from 'src/layout/Button/WrappedButton.module.css';

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
      className={thisIsLoading ? classes.loading : undefined}
      variant={variant}
      color={color}
      onClick={handleClick}
      id={id}
      disabled={disabled}
    >
      {children}
      {thisIsLoading && <ButtonLoader />}
    </Button>
  );
};
