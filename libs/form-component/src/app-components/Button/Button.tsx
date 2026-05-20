import type { PropsWithChildren, Ref } from 'react';

import { Button as DesignSystemButton } from '@digdir/designsystemet-react';
import type { ButtonProps as DesignSystemButtonProps } from '@digdir/designsystemet-react';

import { Spinner } from '../Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | undefined;
export type ButtonColor = 'first' | 'second' | 'danger' | undefined;
export type TextAlign = 'left' | 'center' | 'right';

export type ButtonProps = {
  variant?: ButtonVariant;
  color?: ButtonColor;
  isLoading?: boolean;
  loadingLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  textAlign?: TextAlign;
  title?: string;
  'aria-label'?: string;
  ref?: Ref<HTMLButtonElement>;
} & Omit<DesignSystemButtonProps, 'variant' | 'color' | 'size' | 'title' | 'aria-label'>;

type DSButtonColor =
  | 'accent'
  | 'neutral'
  | 'success'
  | 'danger'
  | 'brand1'
  | 'brand2'
  | 'brand3'
  | undefined;

function mapColorNames(color: ButtonColor): DesignSystemButtonProps['data-color'] {
  switch (color) {
    case 'first':
      return 'accent';
    case 'second':
      return 'neutral';
    default:
      return color ?? 'accent';
  }
}

export function Button({
  disabled,
  isLoading = false,
  variant = 'primary',
  color = 'first',
  size = 'sm',
  children,
  fullWidth,
  style,
  textAlign,
  loadingLabel,
  ref,
  ...rest
}: PropsWithChildren<ButtonProps>) {
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
            aria-label={loadingLabel}
            data-color={color}
            data-size={size === 'lg' ? 'sm' : 'xs'}
          />
          {children}
        </>
      ) : (
        children
      )}
    </DesignSystemButton>
  );
}
