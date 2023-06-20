import React from 'react';

import { FooterGenericLink } from 'src/features/footer/components/shared/FooterGenericLink';
import { useLanguage } from 'src/hooks/useLanguage';
import type { IFooterEmailComponent } from 'src/features/footer/components/Email/types';

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
