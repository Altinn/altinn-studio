import type { PropsWithChildren, Ref } from 'react';

import { Button as DesignSystemButton } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { ButtonProps as DesignSystemButtonProps } from '@digdir/designsystemet-react';

import classes from './Button.module.css';

import { Spinner } from 'src/app-components/Spinner';

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

// Maps our custom ColorProperty to properties supported by Designsystemet. Color property of Button in Designsystemet does not support success, so we map that to our custom class
function mapColorNames(color: ButtonColor): {
  className?: string;
  color?: DesignSystemButtonProps['data-color'];
} {
  switch (color) {
    case 'first':
      return { color: 'accent' };
    case 'second':
      return { color: 'neutral' };
    case 'success':
      return { className: classes.buttonSuccess };
    default:
      return { color: color ?? 'accent' };
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
  className,
  ref,
  ...rest
}: PropsWithChildren<ButtonProps>) {
  const expandedStyle = { ...style, justifyContent: textAlign ? textAlign : undefined };
  const { className: buttonClassName, color: mappedColor } = mapColorNames(color);
  return (
    <DesignSystemButton
      {...rest}
      disabled={disabled || isLoading}
      variant={variant}
      data-color={mappedColor}
      data-size={size}
      data-fullwidth={fullWidth ? true : undefined}
      ref={ref}
      style={expandedStyle}
      className={cn(buttonClassName, className)}
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
