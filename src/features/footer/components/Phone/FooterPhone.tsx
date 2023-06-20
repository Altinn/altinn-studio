import React from 'react';

import { FooterGenericLink } from 'src/features/footer/components/shared/FooterGenericLink';
import { useLanguage } from 'src/hooks/useLanguage';
import type { IFooterPhoneComponent } from 'src/features/footer/components/Phone/types';

export const FooterPhone = ({ title, target }: IFooterPhoneComponent) => {
  const { langAsString } = useLanguage();

  return (
    <FooterGenericLink
      title={langAsString(title)}
      target={`tel:${langAsString(target)}`}
      icon='phone'
      external={false}
    />
  );
};
