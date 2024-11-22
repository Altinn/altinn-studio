import React from 'react';

import { HelpText } from '@digdir/designsystemet-react';

import { Description } from 'src/components/form/Description';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import type { GenericComponentOverrideDisplay } from 'src/layout/FormComponentContext';

type Args = {
  readOnly: boolean | undefined;
  required: boolean | undefined;
  showOptionalMarking: boolean | undefined;
  textResourceBindings:
    | { title?: string | undefined; help?: string | undefined; description?: string | undefined }
    | undefined;
  overrideDisplay: GenericComponentOverrideDisplay | undefined;
};

export function useLabel({ readOnly, required, showOptionalMarking, textResourceBindings, overrideDisplay }: Args) {
  const { langAsString } = useLanguage();
  const { title, help, description } = textResourceBindings ?? {};

  const shouldShowLabel = (overrideDisplay?.renderLabel ?? true) && overrideDisplay?.renderedInTable !== true;
  const labelText = shouldShowLabel ? langAsString(textResourceBindings?.title) : undefined;

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
      <HelpText
        id={`${title}-helptext`}
        title={`${langAsString('helptext.button_title_prefix')} ${langAsString(title)}`}
      >
        <Lang id={help} />
      </HelpText>
    ) : undefined;

  const getDescriptionComponent = () =>
    description ? <Description description={<Lang id={description} />} /> : undefined;

  return {
    labelText,
    getRequiredComponent,
    getOptionalComponent,
    getHelpTextComponent,
    getDescriptionComponent,
  };
}
