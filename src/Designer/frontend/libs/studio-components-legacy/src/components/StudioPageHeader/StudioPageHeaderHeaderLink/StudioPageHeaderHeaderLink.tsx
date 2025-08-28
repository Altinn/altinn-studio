import type { HTMLAttributes, ReactElement } from 'react';
import commonClasses from '../common.module.css';
import { type StudioPageHeaderColor } from '../types/StudioPageHeaderColor';
import cn from 'classnames';
import { type StudioPageHeaderVariant } from '../types/StudioPageHeaderVariant';
import linkClasses from './StudioPageHeaderHeaderLink.module.css';
import { studioBetaTagClasses } from '@studio/components-legacy';

export type StudioPageHeaderHeaderLinkProps = {
  color: StudioPageHeaderColor;
  variant: StudioPageHeaderVariant;
  renderLink: (props: HTMLAttributes<HTMLAnchorElement>) => ReactElement;
  isBeta?: boolean;
} & HTMLAttributes<HTMLAnchorElement>;

export function StudioPageHeaderHeaderLink({
  color,
  variant,
  className: givenClass,
  renderLink,
  isBeta,
}: StudioPageHeaderHeaderLinkProps): ReactElement {
  const className = cn(
    commonClasses.linkOrButton,
    commonClasses[variant],
    commonClasses[color],
    isBeta && studioBetaTagClasses.isBeta,
    givenClass,
    linkClasses.link,
  );
  const props: HTMLAttributes<HTMLAnchorElement> = {
    className,
  };
  return renderLink(props);
}

StudioPageHeaderHeaderLink.displayName = 'StudioPageHeader.HeaderLink';
