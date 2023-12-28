import React from 'react';

import { SearchField } from '@altinn/altinn-design-system';
import { LegacyTextField } from '@digdir/design-system-react';

import { FD } from 'src/features/formData/FormDataWrite';
import { useLanguage } from 'src/features/language/useLanguage';
import { useMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { useRerender } from 'src/hooks/useReload';
import { canBeParsedToDecimal } from 'src/utils/formattingUtils';
import { useCharacterLimit } from 'src/utils/inputUtils';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IInputFormatting } from 'src/layout/Input/config.generated';

export type IInputProps = PropsFromGenericComponent<'Input'>;

export function InputComponent({ node, isValid, overrideDisplay }: IInputProps) {
  const {
    id,
    readOnly,
    required,
    formatting,
    variant,
    textResourceBindings,
    dataModelBindings,
    saveWhileTyping,
    autocomplete,
    maxLength,
  } = node.item;
  const characterLimit = useCharacterLimit(maxLength);
  const value = FD.usePickFreshString(dataModelBindings?.simpleBinding);
  const { langAsString } = useLanguage();
  const reactNumberFormatConfig = useMapToReactNumberConfig(formatting as IInputFormatting | undefined, value);
  const [inputKey, rerenderInput] = useRerender('input');
  const setValue = FD.useSetForBindings(dataModelBindings, saveWhileTyping);
  const debounce = FD.useDebounceImmediately();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!reactNumberFormatConfig.number || canBeParsedToDecimal(e.target.value)) {
      setValue('simpleBinding', e.target.value);
    }
  }

  function onBlur() {
    if (reactNumberFormatConfig.number) {
      rerenderInput();
    }
    debounce();
  }

  const ariaLabel = overrideDisplay?.renderedInTable === true ? langAsString(textResourceBindings?.title) : undefined;

  return (
    <>
      {variant === 'search' ? (
        <SearchField
          id={id}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
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
          characterLimit={!readOnly ? characterLimit : undefined}
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
