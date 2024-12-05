import React, { forwardRef } from 'react';

import { Link } from '@digdir/designsystemet-react';
import type { LinkProps } from '@digdir/designsystemet-react';

export type StudioBreadcrumbsLinkProps = LinkProps;

export const StudioBreadcrumbsLink = forwardRef<HTMLAnchorElement, StudioBreadcrumbsLinkProps>(
  function BreadcrumbsLink(rest, ref) {
    return <Link ref={ref} {...rest} />;
  },
);
