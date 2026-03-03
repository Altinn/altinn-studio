import React from 'react';

import { HelpText } from 'src/app-components/HelpText/HelpText';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { asTranslationKey } from 'nextsrc/libs/form-engine/AppComponentsBridge';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';

/**
 * Builds the common label props (help, description, requiredIndicator) for use with
 * the app-components Label and Fieldset wrappers.
 */
export function useLabelProps(textResourceBindings: { help?: unknown; description?: unknown; title?: unknown } | undefined) {
  const helpKey = typeof textResourceBindings?.help === 'string' ? textResourceBindings.help : undefined;
  const helpText = useTextResource(helpKey);
  const descriptionKey =
    typeof textResourceBindings?.description === 'string' ? textResourceBindings.description : undefined;
  const description = useTextResource(descriptionKey);
  const titleKey = typeof textResourceBindings?.title === 'string' ? textResourceBindings.title : undefined;
  const { langAsString } = useLanguage();

  const helpComponent = helpText ? (
    <HelpText
      titlePrefix={asTranslationKey('helptext.button_title_prefix')}
      title={asTranslationKey(titleKey ?? 'helptext.button_title')}
    >
      {helpText}
    </HelpText>
  ) : undefined;

  const descriptionComponent = description ? <span>{description}</span> : undefined;

  const requiredIndicator = <span> {langAsString('form_filler.required_label')}</span>;

  return {
    help: helpComponent,
    description: descriptionComponent,
    requiredIndicator,
  };
}
