import React from 'react';

import { FooterGenericLink } from 'src/features/footer/components/shared/FooterGenericLink';
import { useLanguage } from 'src/features/language/useLanguage';
import type { IFooterBaseComponent } from 'src/features/footer/types';

export interface IFooterEmailComponent extends IFooterBaseComponent<'Email'> {
  title: string;
  target: string;
}

export const FooterEmail = ({ title, target }: IFooterEmailComponent) => {
  const { langAsString } = useLanguage();

  return (
    <FooterGenericLink
      title={langAsString(title)}
      target={`mailto:${langAsString(target)}`}
      icon='email'
      external={false}
    />
  );
};
