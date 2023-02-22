import React from 'react';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { FooterGenericLink } from 'src/features/footer/components/shared/FooterGenericLink';
import { getTextResourceByKey } from 'src/language/sharedLanguage';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { IFooterLinkComponent } from 'src/features/footer/components/Link/types';

export const FooterLink = ({ title, target, icon }: IFooterLinkComponent) => {
  const textResources = useAppSelector((state) => state.textResources.resources);
  const language = useAppSelector((state) => state.language.language);

  if (!textResources || !language) {
    return null;
  }

  return (
    <FooterGenericLink
      title={getTextFromAppOrDefault(title, textResources, language, undefined, true)}
      target={getTextResourceByKey(target, textResources)}
      icon={icon}
    />
  );
};
