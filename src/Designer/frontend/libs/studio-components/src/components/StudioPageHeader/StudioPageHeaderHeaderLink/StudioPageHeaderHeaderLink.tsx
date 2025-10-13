import type { HTMLAttributes, ReactElement } from 'react';
import { type StudioPageHeaderColor } from '../types/StudioPageHeaderColor';
import cn from 'classnames';
import { type StudioPageHeaderVariant } from '../types/StudioPageHeaderVariant';
import linkClasses from './StudioPageHeaderHeaderLink.module.css';
import { studioBetaTagClasses } from '@studio/components';

export type StudioPageHeaderHeaderLinkProps = {
  color: StudioPageHeaderColor;
  variant: StudioPageHeaderVariant;
  renderLink: (props: HTMLAttributes<HTMLAnchorElement>) => ReactElement;
  isBeta?: boolean;
} & HTMLAttributes<HTMLAnchorElement>;

function StudioPageHeaderHeaderLink({
  className: givenClass,
  renderLink,
  isBeta,
}: StudioPageHeaderHeaderLinkProps): ReactElement {
  const className = cn(isBeta && studioBetaTagClasses.isBeta, givenClass, linkClasses.link);
  const props: HTMLAttributes<HTMLAnchorElement> = {
    className,
  };
  return renderLink(props);
}

StudioPageHeaderHeaderLink.displayName = 'StudioPageHeader.HeaderLink';

export { StudioPageHeaderHeaderLink };
