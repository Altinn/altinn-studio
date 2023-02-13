import React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import classNames from 'classnames';

import { ButtonLoader } from 'src/layout/Button/ButtonLoader';
import css from 'src/layout/Button/WrappedButton.module.css';
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
    <span
      className={classNames(
        css['wrapped-button'],
        somethingIsLoading && css['wrapped-button--loading'],
        thisIsLoading && css['wrapped-button--busy'],
      )}
    >
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
    </span>
  );
};
