import React from 'react';

import { FooterGenericLink } from 'src/features/footer/components/shared/FooterGenericLink';
import { useLanguage } from 'src/hooks/useLanguage';
import type { IFooterLinkComponent } from 'src/features/footer/components/Link/types';

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
