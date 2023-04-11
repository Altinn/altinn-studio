import React from 'react';

import { FooterGenericLink } from 'src/features/footer/components/shared/FooterGenericLink';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getTextResourceByKey } from 'src/language/sharedLanguage';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { IFooterPhoneComponent } from 'src/features/footer/components/Phone/types';

export const FooterPhone = ({ title, target }: IFooterPhoneComponent) => {
  const textResources = useAppSelector((state) => state.textResources.resources);
  const language = useAppSelector((state) => state.language.language);

  if (!textResources || !language) {
    return null;
  }

  return (
    <FooterGenericLink
      title={getTextFromAppOrDefault(title, textResources, language, undefined, true)}
      target={`tel:${getTextResourceByKey(target, textResources)}`}
      icon='phone'
      external={false}
    />
  );
};
