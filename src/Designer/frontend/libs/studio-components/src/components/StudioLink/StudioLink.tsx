import React, { forwardRef } from 'react';
import type { ReactElement, ReactNode, Ref } from 'react';
import { Link } from '@digdir/designsystemet-react';
import type { LinkProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';
import type { IconPlacement } from '../../types/IconPlacement';
import { TextWithIcon } from '../TextWithIcon';

export type StudioLinkProps = WithoutAsChild<LinkProps> & {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
};

function StudioLink(
  { children, icon, iconPlacement, ...rest }: StudioLinkProps,
  ref?: Ref<HTMLAnchorElement>,
): ReactElement {
  return (
    <Link ref={ref} {...rest}>
      {icon ? (
        <TextWithIcon icon={icon} iconPlacement={iconPlacement}>
          {children}
        </TextWithIcon>
      ) : (
        children
      )}
    </Link>
  );
}

const ForwardedStudioLink = forwardRef(StudioLink);

export { ForwardedStudioLink as StudioLink };
