import React, { forwardRef } from 'react';
import type { PropsWithChildren } from 'react';

import { Button as DesignSystemButton } from '@digdir/designsystemet-react';
import type { ButtonProps as DesignSystemButtonProps } from '@digdir/designsystemet-react';

import { Spinner } from 'src/app-components/loading/Spinner/Spinner';
import { useLanguage } from 'src/features/language/useLanguage';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | undefined;
export type ButtonColor = 'first' | 'second' | 'success' | 'danger' | undefined;
export type TextAlign = 'left' | 'center' | 'right';

export type ButtonProps = {
  variant?: ButtonVariant;
  color?: ButtonColor;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  textAlign?: TextAlign;
} & Omit<DesignSystemButtonProps, 'variant' | 'color' | 'size'>;

type DSButtonColor = 'accent' | 'neutral' | 'success' | 'danger' | 'brand1' | 'brand2' | 'brand3' | undefined;

function mapColorNames(color: ButtonColor): DSButtonColor {
  switch (color) {
    case 'first':
      return 'accent';
    case 'second':
      return 'neutral';
    default:
      return color ?? 'accent';
  }
}

export const Button = forwardRef<HTMLButtonElement, PropsWithChildren<ButtonProps>>(function Button(
  {
    disabled,
    isLoading = false,
    variant = 'primary',
    color = 'first',
    size = 'sm',
    children,
    fullWidth,
    style,
    textAlign,
    ...rest
  },
  ref,
) {
  const { langAsString } = useLanguage();
  const expandedStyle = { ...style, justifyContent: textAlign ? textAlign : undefined };
  return (
    <DesignSystemButton
      {...rest}
      disabled={disabled || isLoading}
      variant={variant}
      data-color={mapColorNames(color)}
      data-size={size}
      data-fullwidth={fullWidth ? true : undefined}
      ref={ref}
      style={expandedStyle}
    >
      {isLoading ? (
        <>
          <Spinner
            aria-hidden='true'
            data-color={color}
            data-size={size === 'lg' ? 'sm' : 'xs'}
            aria-label={langAsString('general.loading')}
          />
          {children}
        </>
      ) : (
        children
      )}
    </DesignSystemButton>
  );
});
