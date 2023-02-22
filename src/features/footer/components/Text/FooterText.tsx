import React from 'react';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { IFooterTextComponent } from 'src/features/footer/components/Text/types';

export const FooterText = ({ title }: IFooterTextComponent) => {
  const textResources = useAppSelector((state) => state.textResources.resources);
  const language = useAppSelector((state) => state.language.language);

  if (!textResources || !language) {
    return null;
  }

  return <span>{getTextFromAppOrDefault(title, textResources, language)}</span>;
};
