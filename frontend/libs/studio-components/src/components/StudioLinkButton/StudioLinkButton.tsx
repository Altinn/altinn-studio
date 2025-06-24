import React, { forwardRef, type Ref, type ReactElement } from 'react';
import cn from 'classnames';
import classes from './StudioLinkButton.module.css';
import type { WithoutAsChild } from '../../types/WithoutAsChild';
import { StudioLink, type StudioLinkProps } from '../StudioLink/StudioLink';

export type StudioLinkButtonProps = WithoutAsChild<StudioLinkProps> & {
  icon?: React.ReactNode;
  disabled?: boolean;
};

function StudioLinkButton(
  {
    children,
    icon,
    iconPlacement = 'left',
    className = '',
    disabled = false,
    ...rest
  }: StudioLinkButtonProps,
  ref?: Ref<HTMLAnchorElement>,
): ReactElement {
  return (
    <StudioLink
      {...rest}
      className={cn(classes.linkButton, className, { [classes.disabled]: disabled })}
      data-color='neutral'
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
