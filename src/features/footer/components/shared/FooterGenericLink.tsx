import React from 'react';

import { FooterIcon } from 'src/features/footer/components/shared/FooterIcon';
import css from 'src/features/footer/components/shared/shared.module.css';
import type { IFooterIcon } from 'src/features/footer/types';

interface FooterGenericLinkProps {
  title: string;
  target: string;
  icon?: IFooterIcon;
}

export const FooterGenericLink = ({ title, target, icon }: FooterGenericLinkProps) => (
  <a
    href={target}
    target='_blank'
    rel='noreferrer'
    className={css.link}
  >
    {icon && (
      <span style={{ marginRight: 6 }}>
        <FooterIcon icon={icon} />
      </span>
    )}
    <span className={css.link_text}>{title}</span>
  </a>
);
