import type { PropsWithChildren, Ref } from 'react';

import { Button as DesignSystemButton } from '@digdir/designsystemet-react';
import type { ButtonProps as DesignSystemButtonProps } from '@digdir/designsystemet-react';

import { Spinner } from '../Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | undefined;
export type ButtonColor = 'first' | 'second' | 'success' | 'danger' | undefined;
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

// Color property of Button from Designsystemet is typed to not include 'success', but it does work as it is styled generally based on data-color, and 'success' is a valid color.
// Alternative would be to manually sett all color to appropriate color, like
// {--dsc-button-background: var(--ds-color-success-base-default); ---dsc-button-color--hover: var(--ds-color-success-base-hover);)
// and so on for all css properties defined at https://designsystemet.no/no/components/docs/button/code

type ExtendedButtonColor = DesignSystemButtonProps['data-color'] | 'success';

function mapColorNames(color: ButtonColor): ExtendedButtonColor {
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
      data-color={mapColorNames(color) as DesignSystemButtonProps['data-color']}
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
