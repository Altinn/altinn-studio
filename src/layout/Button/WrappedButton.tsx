import React from 'react';

import { Button } from '@digdir/designsystemet-react';

import { ButtonLoader } from 'src/layout/Button/ButtonLoader';

export interface BaseButtonProps {
  nodeId: string;
  onClick: () => void;
  busyWithId?: string | null;
  disabled?: boolean;
  message?: string;
}

export type ButtonProps = React.PropsWithChildren<BaseButtonProps>;

export type ButtonVariant = Parameters<typeof Button>[0]['variant'];
export type ButtonColor = Parameters<typeof Button>[0]['color'];

interface Props extends ButtonProps {
  variant?: ButtonVariant;
  color?: ButtonColor;
}

export const WrappedButton = ({
  nodeId,
  variant = 'secondary',
  color = 'first',
  onClick,
  children,
  busyWithId,
  disabled,
  message,
}: Props) => {
  const somethingIsLoading = !!busyWithId;
  const thisIsLoading = busyWithId === nodeId;
  const handleClick = async () => {
    if (!somethingIsLoading) {
      onClick();
    }
  };

  return (
    <>
      <ButtonLoader isLoading={thisIsLoading}>
        <Button
          data-is-loading={thisIsLoading ? 'true' : 'false'}
          size='small'
          variant={variant}
          color={color}
          onClick={handleClick}
          id={nodeId}
          disabled={disabled || thisIsLoading}
        >
          {children}
        </Button>
      </ButtonLoader>
      {message && <span style={{ position: 'absolute' }}>{message}</span>}
    </>
  );
};
