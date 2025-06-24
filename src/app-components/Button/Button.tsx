import React, { forwardRef } from 'react';
import type { PropsWithChildren } from 'react';

import { Button as DesignSystemButton, Spinner } from '@digdir/designsystemet-react';
import type { ButtonProps as DesignSystemButtonProps } from '@digdir/designsystemet-react';

import { useLanguage } from 'src/features/language/useLanguage';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | undefined;
export type ButtonColor = 'first' | 'second' | 'success' | 'danger' | undefined;
export type TextAlign = 'left' | 'center' | 'right';

export type ButtonProps = {
  variant?: ButtonVariant;
  color?: ButtonColor;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullWidth?: boolean;
  textAlign?: TextAlign;
} & Pick<
  DesignSystemButtonProps,
  | 'id'
  | 'title'
  | 'disabled'
  | 'icon'
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
  | 'asChild'
  | 'popovertarget'
>;

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
    id,
    disabled,
    isLoading = false,
    variant = 'primary',
    color = 'first',
    size = 'sm',
    children,
    className,
    title,
    icon,
    fullWidth,
    onClick,
    style,
    tabIndex,
    onMouseDown,
    onKeyUp,
    asChild,
    textAlign,
    popovertarget,
    'aria-label': ariaLabel,
    'aria-busy': ariaBusy,
    'aria-controls': ariaControls,
    'aria-haspopup': ariaHasPopup,
    'aria-expanded': ariaExpanded,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
  },
  ref,
) {
  const { langAsString } = useLanguage();
  const expandedStyle = { ...style, justifyContent: textAlign ? textAlign : undefined };
  return (
    <DesignSystemButton
      id={id}
      disabled={disabled || isLoading}
      variant={variant}
      data-color={mapColorNames(color)}
      data-size={size}
      data-fullwidth={fullWidth ? true : undefined}
      ref={ref}
      className={className}
      title={title}
      icon={icon}
      onClick={onClick}
      style={expandedStyle}
      tabIndex={tabIndex}
      onMouseDown={onMouseDown}
      onKeyUp={onKeyUp}
      asChild={asChild}
      popovertarget={popovertarget}
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
      aria-controls={ariaControls}
      aria-haspopup={ariaHasPopup}
      aria-expanded={ariaExpanded}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
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
