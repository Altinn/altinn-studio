import React, { forwardRef } from 'react';
import type { ReactElement, ReactNode, Ref } from 'react';
import cn from 'classnames';
import classes from './StudioLinkButton.module.css';
import type { WithoutAsChild } from '../../types/WithoutAsChild';
import { StudioLink } from '../StudioLink/StudioLink';
import type { StudioLinkProps } from '../StudioLink/StudioLink';
import type { ButtonProps } from '@digdir/designsystemet-react';

export type StudioLinkButtonProps = WithoutAsChild<StudioLinkProps> & {
  icon?: ReactNode;
  disabled?: boolean;
  variant?: ButtonProps['variant'];
};

function StudioLinkButton(
  {
    children,
    icon,
    iconPlacement = 'left',
    className: givenClass = '',
    disabled = false,
    'data-color': dataColor = 'neutral',
    variant,
    ...rest
  }: StudioLinkButtonProps,
  ref?: Ref<HTMLAnchorElement>,
): ReactElement {
  const className = cn(classes.linkButton, givenClass, {
    [classes.primary]: variant === 'primary' || variant === undefined,
    [classes.disabled]: disabled,
    [classes.secondary]: variant === 'secondary',
    [classes.secondaryAndTertiary]: variant === 'secondary' || variant === 'tertiary',
  });
  return (
    <StudioLink
      {...rest}
      className={className}
      data-color={dataColor}
      icon={icon}
      iconPlacement={iconPlacement}
      ref={ref}
    >
      {children}
    </StudioLink>
  );
}

const ForwardedStudioLinkButton = forwardRef(StudioLinkButton);

export { ForwardedStudioLinkButton as StudioLinkButton };
