import React from 'react';

import { FooterGenericLink } from 'src/features/footer/components/shared/FooterGenericLink';
import { useLanguage } from 'src/features/language/useLanguage';
import type { IFooterBaseComponent } from 'src/features/footer/types';

export interface IFooterPhoneComponent extends IFooterBaseComponent<'Phone'> {
  title: string;
  target: string;
}

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
