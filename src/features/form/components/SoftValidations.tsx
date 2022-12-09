import React from 'react';

import { useAppSelector } from 'src/common/hooks';
import { Panel } from 'src/features/form/components/Panel';
import { getTextFromAppOrDefault } from 'src/utils/textResource';

import type { ILanguage, ITextResource } from 'src/types/shared';

export interface ISoftValidationProps {
  children: React.ReactNode;
  variant: SoftValidationVariant;
}

export type SoftValidationVariant = 'warning' | 'info' | 'success';

interface IGetPanelTitleProps {
  variant: SoftValidationVariant;
  textResources: ITextResource[];
  language: ILanguage;
}

export const getPanelTitle = ({ variant, textResources, language }: IGetPanelTitleProps) => {
  switch (variant) {
    case 'warning':
      return getTextFromAppOrDefault('soft_validation.warning_title', textResources, language, undefined, true);
    case 'info':
      return getTextFromAppOrDefault('soft_validation.info_title', textResources, language, undefined, true);
    case 'success':
      return getTextFromAppOrDefault('soft_validation.success_title', textResources, language, undefined, true);
  }
};

export function SoftValidations({ variant, children }: ISoftValidationProps) {
  const language = useAppSelector((state) => state.language.language);
  const textResources = useAppSelector((state) => state.textResources.resources);

  if (!language) {
    return null;
  }

  return (
    <Panel
      variant={variant}
      showPointer={true}
      showIcon={true}
      title={getPanelTitle({ variant, textResources, language })}
    >
      {children}
    </Panel>
  );
}
