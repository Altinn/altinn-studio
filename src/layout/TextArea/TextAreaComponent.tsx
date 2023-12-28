import React from 'react';

import { LegacyTextArea } from '@digdir/design-system-react';

import { FD } from 'src/features/formData/FormDataWrite';
import { useLanguage } from 'src/features/language/useLanguage';
import { useCharacterLimit } from 'src/utils/inputUtils';
import type { PropsFromGenericComponent } from 'src/layout';

import 'src/styles/shared.css';

export type ITextAreaProps = PropsFromGenericComponent<'TextArea'>;

export function TextAreaComponent({ node, isValid, overrideDisplay }: ITextAreaProps) {
  const { langAsString } = useLanguage();
  const { id, readOnly, textResourceBindings, dataModelBindings, saveWhileTyping, autocomplete, maxLength } = node.item;
  const characterLimit = useCharacterLimit(maxLength);
  const value = FD.usePickFreshString(dataModelBindings?.simpleBinding);
  const setValue = FD.useSetForBinding(dataModelBindings?.simpleBinding, saveWhileTyping);
  const debounce = FD.useDebounceImmediately();

  return (
    <LegacyTextArea
      id={id}
      onChange={(e) => setValue(e.target.value)}
      onBlur={debounce}
      readOnly={readOnly}
      resize='vertical'
      characterLimit={!readOnly ? characterLimit : undefined}
      isValid={isValid}
      value={value}
      data-testid={id}
      aria-describedby={
        overrideDisplay?.renderedInTable !== true && textResourceBindings ? `description-${id}` : undefined
      }
      aria-label={overrideDisplay?.renderedInTable === true ? langAsString(textResourceBindings?.title) : undefined}
      autoComplete={autocomplete}
      style={{ height: '150px' }}
    />
  );
}
