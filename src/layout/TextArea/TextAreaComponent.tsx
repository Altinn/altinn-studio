import React from 'react';

import { TextArea } from '@digdir/design-system-react';

import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import { useLanguage } from 'src/hooks/useLanguage';
import { createCharacterLimit } from 'src/utils/inputUtils';
import type { PropsFromGenericComponent } from 'src/layout';

import 'src/styles/shared.css';

export type ITextAreaProps = PropsFromGenericComponent<'TextArea'>;

export function TextAreaComponent({
  node,
  formData,
  isValid,
  handleDataChange,
  overrideDisplay,
  getTextResourceAsString,
}: ITextAreaProps) {
  const { lang } = useLanguage();
  const { id, readOnly, textResourceBindings, saveWhileTyping, autocomplete, maxLength } = node.item;
  const suppliedValue = formData?.simpleBinding;
  const { value, setValue, saveValue, onPaste } = useDelayedSavedState(
    handleDataChange,
    suppliedValue ?? '',
    saveWhileTyping,
  );

  return (
    <TextArea
      id={id}
      onBlur={() => saveValue()}
      onChange={(e) => setValue(e.target.value)}
      onPaste={() => onPaste()}
      readOnly={readOnly}
      resize='vertical'
      characterLimit={!readOnly && maxLength !== undefined ? createCharacterLimit(maxLength, lang) : undefined}
      className={
        (isValid ? 'form-control a-textarea ' : 'form-control a-textarea validation-error') +
        (readOnly ? ' disabled' : '')
      }
      value={value}
      data-testid={id}
      aria-describedby={
        overrideDisplay?.renderedInTable !== true && textResourceBindings ? `description-${id}` : undefined
      }
      aria-label={
        overrideDisplay?.renderedInTable === true ? getTextResourceAsString(textResourceBindings?.title) : undefined
      }
      autoComplete={autocomplete}
      style={{ height: '150px' }}
    />
  );
}
