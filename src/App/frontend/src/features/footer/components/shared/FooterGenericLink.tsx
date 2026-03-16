import React from 'react';

import { Link } from '@digdir/designsystemet-react';

import { FooterIcon } from 'src/features/footer/components/shared/FooterIcon';
import type { IFooterIcon } from 'src/features/footer/types';

interface FooterGenericLinkProps {
  title: string;
  target: string;
  icon?: IFooterIcon;
  external?: boolean;
}

export const FooterGenericLink = ({ title, target, icon, external = true }: FooterGenericLinkProps) => (
  <Link
    href={target}
    {...(external && { target: '_blank', rel: 'noreferrer' })}
  >
    {icon && <FooterIcon icon={icon} />}
    {title}
  </Link>
);
