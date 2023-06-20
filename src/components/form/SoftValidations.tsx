import React from 'react';

import { Panel } from 'src/components/form/Panel';
import { useLanguage } from 'src/hooks/useLanguage';
import type { IUseLanguage } from 'src/hooks/useLanguage';

export interface ISoftValidationProps {
  children: React.ReactNode;
  variant: SoftValidationVariant;
}

export type SoftValidationVariant = 'warning' | 'info' | 'success';

interface IGetPanelTitleProps {
  variant: SoftValidationVariant;
  langTools: IUseLanguage;
}

export const getPanelTitle = ({ variant, langTools }: IGetPanelTitleProps) => {
  const { langAsString } = langTools;
  switch (variant) {
    case 'warning':
      return langAsString('soft_validation.warning_title');
    case 'info':
      return langAsString('soft_validation.info_title');
    case 'success':
      return langAsString('soft_validation.success_title');
  }
};

export function SoftValidations({ variant, children }: ISoftValidationProps) {
  const langTools = useLanguage();

  return (
    <Panel
      variant={variant}
      showPointer={true}
      showIcon={true}
      title={getPanelTitle({ variant, langTools })}
    >
      {children}
    </Panel>
  );
}
