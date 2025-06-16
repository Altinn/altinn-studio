import React, { forwardRef, type Ref, type ReactElement } from 'react';
import cn from 'classnames';
import classes from './StudioLinkButton.module.css';
import type { WithoutAsChild } from '@studio/components-legacy/src/types/WithoutAsChild';
import { StudioLink, type StudioLinkProps } from '../StudioLink/StudioLink';

export type StudioLinkButtonProps = WithoutAsChild<StudioLinkProps> & {
  icon?: React.ReactNode;
};

function StudioLinkButton(
  { children, icon, iconPlacement = 'left', className = '', ...rest }: StudioLinkButtonProps,
  ref?: Ref<HTMLAnchorElement>,
): ReactElement {
  return (
    <StudioLink
      {...rest}
      className={cn(classes.linkButton, className)}
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
