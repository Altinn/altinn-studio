import { Panel, PanelVariant } from '@altinn/altinn-design-system';
import type { ILanguage, ITextResource } from 'altinn-shared/types';
import React, { useContext } from 'react';
import { useAppSelector } from 'src/common/hooks';
import { FormComponentContext } from 'src/components';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { FullWidthWrapper } from './FullWidthWrapper';

export interface ISoftValidationProps {
  children: React.ReactNode;
  variant: SoftValidationVariant;
  forceMobileLayout?: boolean;
}

export type SoftValidationVariant = 'warning' | 'info' | 'success';

const getPanelVariant = (messageType: SoftValidationVariant) => {
  switch (messageType) {
    case 'warning':
      return PanelVariant.Warning;
    case 'info':
      return PanelVariant.Info;
    case 'success':
      return PanelVariant.Success;
  }
};

interface IGetPanelTitleProps {
  variant: SoftValidationVariant;
  textResources: ITextResource[];
  language: ILanguage;
}

export const getPanelTitle = ({
  variant,
  textResources,
  language,
}: IGetPanelTitleProps) => {
  switch (variant) {
    case 'warning':
      return getTextFromAppOrDefault(
        'soft_validation.warning_title',
        textResources,
        language,
        undefined,
        true,
      );
    case 'info':
      return getTextFromAppOrDefault(
        'soft_validation.info_title',
        textResources,
        language,
        undefined,
        true,
      );
    case 'success':
      return getTextFromAppOrDefault(
        'soft_validation.success_title',
        textResources,
        language,
        undefined,
        true,
      );
  }
};

const ValidationPanel = ({
  variant,
  children,
  forceMobileLayout,
}: ISoftValidationProps) => {
  const language = useAppSelector((state) => state.language.language);
  const textResources = useAppSelector(
    (state) => state.textResources.resources,
  );

  return (
    <Panel
      variant={getPanelVariant(variant)}
      showPointer
      showIcon
      title={getPanelTitle({ variant, textResources, language })}
      forceMobileLayout={forceMobileLayout}
    >
      {children}
    </Panel>
  );
};

export function SoftValidations(props: ISoftValidationProps) {
  const { grid, baseComponentId } = useContext(FormComponentContext);
  const shouldHaveFullWidth = !grid && !baseComponentId;

  if (shouldHaveFullWidth) {
    return (
      <FullWidthWrapper>
        <ValidationPanel {...props} />
      </FullWidthWrapper>
    );
  } else {
    return <ValidationPanel forceMobileLayout={true} {...props} />;
  }
}
