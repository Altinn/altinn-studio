import type { HTMLAttributes, ReactElement } from 'react';
import cn from 'classnames';
import linkClasses from './StudioPageHeaderHeaderLink.module.css';
import { studioBetaTagClasses } from '@studio/components';

export type StudioPageHeaderHeaderLinkProps = {
  renderLink: (props: HTMLAttributes<HTMLAnchorElement>) => ReactElement;
  isBeta?: boolean;
} & HTMLAttributes<HTMLAnchorElement>;

function StudioPageHeaderHeaderLink({
  className: givenClass,
  renderLink,
  isBeta,
  ...rest
}: StudioPageHeaderHeaderLinkProps): ReactElement {
  const className = cn(isBeta && studioBetaTagClasses.isBeta, givenClass, linkClasses.link);
  const props: HTMLAttributes<HTMLAnchorElement> = {
    className,
    ...rest,
  };
  return renderLink(props);
}

StudioPageHeaderHeaderLink.displayName = 'StudioPageHeader.HeaderLink';

export { StudioPageHeaderHeaderLink };
