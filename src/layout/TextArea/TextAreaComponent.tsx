import React from 'react';

import { LegacyTextArea } from '@digdir/design-system-react';

import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import { useLanguage } from 'src/hooks/useLanguage';
import { createCharacterLimit } from 'src/utils/inputUtils';
import type { PropsFromGenericComponent } from 'src/layout';

import 'src/styles/shared.css';

export type ITextAreaProps = PropsFromGenericComponent<'TextArea'>;

export function TextAreaComponent({ node, formData, isValid, handleDataChange, overrideDisplay }: ITextAreaProps) {
  const { lang, langAsString } = useLanguage();
  const { id, readOnly, textResourceBindings, saveWhileTyping, autocomplete, maxLength } = node.item;
  const suppliedValue = formData?.simpleBinding;
  const { value, setValue, saveValue, onPaste } = useDelayedSavedState(
    handleDataChange,
    suppliedValue ?? '',
    saveWhileTyping,
  );

  return (
    <LegacyTextArea
      id={id}
      onBlur={() => saveValue()}
      onChange={(e) => setValue(e.target.value)}
      onPaste={() => onPaste()}
      readOnly={readOnly}
      resize='vertical'
      characterLimit={!readOnly && maxLength !== undefined ? createCharacterLimit(maxLength, lang) : undefined}
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
