import React from 'react';

import { Button } from '@digdir/design-system-react';

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

export type ButtonVariant = Parameters<typeof Button>[0]['variant'];
export type ButtonColor = Parameters<typeof Button>[0]['color'];

interface Props extends ButtonProps {
  variant?: ButtonVariant;
  color?: ButtonColor;
}

export const WrappedButton = ({
  variant = 'outline',
  color = 'primary',
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
    <ButtonLoader isLoading={thisIsLoading}>
      <Button
        data-is-loading={thisIsLoading ? 'true' : 'false'}
        size='small'
        variant={variant}
        color={color}
        onClick={handleClick}
        id={id}
        disabled={disabled || thisIsLoading}
      >
        {children}
      </Button>
    </ButtonLoader>
  );
};
