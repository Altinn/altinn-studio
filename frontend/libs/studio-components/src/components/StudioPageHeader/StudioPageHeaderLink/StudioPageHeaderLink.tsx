import type { HTMLAttributes, ReactElement } from 'react';
import commonClasses from '../common.module.css';
import { type StudioPageHeaderColor } from '../types/StudioPageHeaderColor';
import cn from 'classnames';
import { type StudioPageHeaderVariant } from '../types/StudioPageHeaderVariant';
import linkClasses from './StudioPageHeaderLink.module.css';

export type StudioPageHeaderLinkProps = {
  color: StudioPageHeaderColor;
  variant: StudioPageHeaderVariant;
  renderLink: (props: HTMLAttributes<HTMLAnchorElement>) => ReactElement;
} & HTMLAttributes<HTMLAnchorElement>;

export function StudioPageHeaderLink({
  color,
  variant,
  className: givenClass,
  renderLink,
}: StudioPageHeaderLinkProps): ReactElement {
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

StudioPageHeaderLink.displayName = 'StudioPageHeader.HeaderLink';
