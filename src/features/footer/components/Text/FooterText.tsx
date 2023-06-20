import React from 'react';

import { useLanguage } from 'src/hooks/useLanguage';
import type { IFooterTextComponent } from 'src/features/footer/components/Text/types';

export const FooterText = ({ title }: IFooterTextComponent) => {
  const { lang } = useLanguage();

  return <span>{lang(title)}</span>;
};
