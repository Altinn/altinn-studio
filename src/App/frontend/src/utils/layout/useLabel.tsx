import React from 'react';

import { Description, HelpTextContainer, OptionalIndicator, RequiredIndicator } from '@app/form-component';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useLabelData } from 'src/utils/layout/useLabelData';
import type { GenericComponentOverrideDisplay } from 'src/layout/FormComponentContext';

export function useLabel({
  baseComponentId,
  overrideDisplay,
}: {
  baseComponentId: string;
  overrideDisplay: GenericComponentOverrideDisplay | undefined;
}) {
  const { componentId, title, help, description, required, readOnly, showOptionalMarking } = useLabelData({
    baseComponentId,
    overrideDisplay,
  });
  const { langAsString } = useLanguage();

  const shouldShowLabel = (overrideDisplay?.renderLabel ?? true) && overrideDisplay?.renderedInTable !== true && title;
  const labelText = shouldShowLabel ? <Lang id={title} /> : undefined;

  const getRequiredComponent = () => (required ? <RequiredIndicator required={required} /> : undefined);
  const getOptionalComponent = () =>
    !required ? (
      <OptionalIndicator
        readOnly={readOnly}
        required={required}
        showOptionalMarking={showOptionalMarking}
      />
    ) : undefined;

  const getHelpTextComponent = () =>
    help ? (
      <HelpTextContainer
        title={langAsString(title)}
        helpText={<Lang id={help} />}
      />
    ) : undefined;

  const getDescriptionComponent = () =>
    description ? (
      <Description
        componentId={componentId}
        description={<Lang id={description} />}
      />
    ) : undefined;

  return {
    labelText,
    getRequiredComponent,
    getOptionalComponent,
    getHelpTextComponent,
    getDescriptionComponent,
  };
}
