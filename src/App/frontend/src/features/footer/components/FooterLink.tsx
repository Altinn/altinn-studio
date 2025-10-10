import React from 'react';

import { FooterGenericLink } from 'src/features/footer/components/shared/FooterGenericLink';
import { useLanguage } from 'src/features/language/useLanguage';
import type { IFooterBaseComponent, IFooterIcon } from 'src/features/footer/types';

export interface IFooterLinkComponent extends IFooterBaseComponent<'Link'> {
  title: string;
  target: string;
  icon?: IFooterIcon;
}

export const FooterLink = ({ title, target, icon }: IFooterLinkComponent) => {
  const { langAsString } = useLanguage();

  return (
    <FooterGenericLink
      title={langAsString(title)}
      target={langAsString(target)}
      icon={icon}
    />
  );
};
