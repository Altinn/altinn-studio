import React from 'react';

import { SearchField } from '@altinn/altinn-design-system';
import { LegacyTextField } from '@digdir/design-system-react';

import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import { useLanguage } from 'src/hooks/useLanguage';
import { useMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { useRerender } from 'src/hooks/useReload';
import { canBeParsedToDecimal } from 'src/utils/formattingUtils';
import { createCharacterLimit } from 'src/utils/inputUtils';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IInputFormatting } from 'src/layout/Input/config.generated';

export type IInputProps = PropsFromGenericComponent<'Input'>;

export function InputComponent({ node, isValid, formData, handleDataChange, overrideDisplay }: IInputProps) {
  const {
    id,
    readOnly,
    required,
    formatting,
    variant,
    textResourceBindings,
    saveWhileTyping,
    autocomplete,
    maxLength,
  } = node.item;
  const { value, setValue, saveValue, onPaste } = useDelayedSavedState(
    handleDataChange,
    formData?.simpleBinding ?? '',
    saveWhileTyping,
  );
  const { lang, langAsString } = useLanguage();
  const reactNumberFormatConfig = useMapToReactNumberConfig(formatting as IInputFormatting | undefined, value);
  const [inputKey, rerenderInput] = useRerender('input');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!reactNumberFormatConfig.number || canBeParsedToDecimal(e.target.value)) {
      setValue(e.target.value);
    }
  }

  function onBlur() {
    saveValue();
    if (reactNumberFormatConfig.number) {
      rerenderInput();
    }
  }

  const ariaLabel = overrideDisplay?.renderedInTable === true ? langAsString(textResourceBindings?.title) : undefined;

  return (
    <>
      {variant === 'search' ? (
        <SearchField
          id={id}
          value={value}
          onChange={handleChange}
          onBlur={saveValue}
          onPaste={onPaste}
          disabled={readOnly}
          aria-label={ariaLabel}
          aria-describedby={textResourceBindings?.description ? `description-${id}` : undefined}
        ></SearchField>
      ) : (
        <LegacyTextField
          key={inputKey}
          id={id}
          onBlur={onBlur}
          onChange={handleChange}
          onPaste={onPaste}
          characterLimit={!readOnly && maxLength !== undefined ? createCharacterLimit(maxLength, lang) : undefined}
          readOnly={readOnly}
          isValid={isValid}
          required={required}
          value={value}
          aria-label={ariaLabel}
          aria-describedby={textResourceBindings?.description ? `description-${id}` : undefined}
          formatting={reactNumberFormatConfig}
          autoComplete={autocomplete}
        />
      )}
    </>
  );
}
