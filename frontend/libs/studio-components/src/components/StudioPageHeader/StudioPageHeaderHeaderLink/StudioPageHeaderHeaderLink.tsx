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
  isBeta?: boolean;
  'aria-description'?: string;
} & HTMLAttributes<HTMLAnchorElement>;

export const defaultAriaDescription = 'This feature is in beta';

export function StudioPageHeaderHeaderLink({
  color,
  variant,
  className: givenClass,
  renderLink,
  isBeta,
  'aria-description': ariaDescription = defaultAriaDescription,
}: StudioPageHeaderHeaderLinkProps): ReactElement {
  const className = cn(
    commonClasses.linkOrButton,
    commonClasses[variant],
    commonClasses[color],
    isBeta && commonClasses['betaContainer'],
    givenClass,
    linkClasses.link,
  );
  const props: HTMLAttributes<HTMLAnchorElement> = {
    className,
    'aria-description': isBeta ? ariaDescription : undefined,
  };
  return renderLink(props);
}

StudioPageHeaderHeaderLink.displayName = 'StudioPageHeader.HeaderLink';
