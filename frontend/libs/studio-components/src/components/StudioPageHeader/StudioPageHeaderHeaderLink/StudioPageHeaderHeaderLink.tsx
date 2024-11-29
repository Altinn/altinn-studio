import type { HTMLAttributes, ReactElement } from 'react';
import commonClasses from '../common.module.css';
import { type StudioPageHeaderColor } from '../types/StudioPageHeaderColor';
import cn from 'classnames';
import { type StudioPageHeaderVariant } from '../types/StudioPageHeaderVariant';
import linkClasses from './StudioPageHeaderHeaderLink.module.css';

export type StudioPageHeaderHeaderLinkProps = {
  color: StudioPageHeaderColor;
  variant: StudioPageHeaderVariant;
  renderLink: (props: HTMLAttributes<HTMLAnchorElement>) => ReactElement;
} & HTMLAttributes<HTMLAnchorElement>;

export function StudioPageHeaderHeaderLink({
  color,
  variant,
  className: givenClass,
  renderLink,
}: StudioPageHeaderHeaderLinkProps): ReactElement {
  const className = cn(
    commonClasses.linkOrButton,
    commonClasses[variant],
    commonClasses[color],
    givenClass,
    linkClasses.link,
  );
  const props: HTMLAttributes<HTMLAnchorElement> = { className };
  return renderLink(props);
}

StudioPageHeaderHeaderLink.displayName = 'StudioPageHeader.HeaderLink';
