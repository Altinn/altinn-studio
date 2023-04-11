import React from 'react';

import { FooterIcon } from 'src/features/footer/components/shared/FooterIcon';
import classes from 'src/features/footer/components/shared/shared.module.css';
import type { IFooterIcon } from 'src/features/footer/types';

interface FooterGenericLinkProps {
  title: string;
  target: string;
  icon?: IFooterIcon;
  external?: boolean;
}

export const FooterGenericLink = ({ title, target, icon, external = true }: FooterGenericLinkProps) => (
  <a
    href={target}
    {...(external && { target: '_blank', rel: 'noreferrer' })}
    className={classes.link}
  >
    {icon && (
      <span style={{ marginRight: 6 }}>
        <FooterIcon icon={icon} />
      </span>
    )}
    <span className={classes.link_text}>{title}</span>
  </a>
);
