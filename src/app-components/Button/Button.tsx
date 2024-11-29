import React, { forwardRef } from 'react';
import type { PropsWithChildren } from 'react';

import { Button as DesignSystemButton, Spinner } from '@digdir/designsystemet-react';
import type { ButtonProps as DesignSystemButtonProps } from '@digdir/designsystemet-react';

import { useLanguage } from 'src/features/language/useLanguage';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | undefined;
export type ButtonColor = 'first' | 'second' | 'success' | 'danger' | undefined;

export type ButtonProps = {
  variant?: ButtonVariant;
  color?: ButtonColor;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
} & Pick<
  DesignSystemButtonProps,
  | 'id'
  | 'title'
  | 'disabled'
  | 'icon'
  | 'fullWidth'
  | 'onClick'
  | 'style'
  | 'tabIndex'
  | 'onMouseDown'
  | 'aria-label'
  | 'aria-busy'
  | 'aria-controls'
  | 'aria-haspopup'
  | 'aria-expanded'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'onKeyUp'
>;

export const Button = forwardRef<HTMLButtonElement, PropsWithChildren<ButtonProps>>(function Button(
  { id, disabled, isLoading = false, variant = 'primary', color = 'first', size = 'sm', children, ...props },
  ref,
) {
  const { langAsString } = useLanguage();
  return (
    <DesignSystemButton
      id={id}
      disabled={disabled || isLoading}
      variant={variant}
      color={color}
      size={size}
      ref={ref}
      {...props}
    >
      {isLoading && (
        <Spinner
          aria-hidden='true'
          color={color}
          size={size === 'lg' ? 'sm' : 'xs'}
          title={langAsString('general.loading')}
        />
      )}
      {children}
    </DesignSystemButton>
  );
});
