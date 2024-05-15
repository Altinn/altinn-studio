import React from 'react';

import { LegacyTextArea } from '@digdir/design-system-react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { useCharacterLimit } from 'src/utils/inputUtils';
import type { PropsFromGenericComponent } from 'src/layout';

import 'src/styles/shared.css';

export type ITextAreaProps = PropsFromGenericComponent<'TextArea'>;

export function TextAreaComponent({ node, isValid, overrideDisplay }: ITextAreaProps) {
  const { langAsString } = useLanguage();
  const { id, readOnly, textResourceBindings, dataModelBindings, saveWhileTyping, autocomplete, maxLength } = node.item;
  const characterLimit = useCharacterLimit(maxLength);
  const {
    formData: { simpleBinding: value },
    setValue,
    debounce,
  } = useDataModelBindings(dataModelBindings, saveWhileTyping);

  return (
    <LegacyTextArea
      id={id}
      onChange={(e) => setValue('simpleBinding', e.target.value)}
      onBlur={debounce}
      readOnly={readOnly}
      resize='vertical'
      characterLimit={!readOnly ? characterLimit : undefined}
      isValid={isValid}
      value={value}
      data-testid={id}
      aria-describedby={
        overrideDisplay?.renderedInTable !== true && textResourceBindings?.description ? `description-${id}` : undefined
      }
      aria-label={overrideDisplay?.renderedInTable === true ? langAsString(textResourceBindings?.title) : undefined}
      autoComplete={autocomplete}
      style={{ height: '150px' }}
    />
  );
}
