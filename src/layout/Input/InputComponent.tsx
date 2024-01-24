import React, { useCallback } from 'react';

import { SearchField } from '@altinn/altinn-design-system';
import { LegacyTextField } from '@digdir/design-system-react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { useMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { useRerender } from 'src/hooks/useReload';
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
  const { langAsString } = useLanguage();
  const {
    formData: { simpleBinding: value },
    setValue,
    debounce,
  } = useDataModelBindings(dataModelBindings, saveWhileTyping);

  const reactNumberFormatConfig = useMapToReactNumberConfig(formatting as IInputFormatting | undefined, value);
  const [inputKey, rerenderInput] = useRerender('input');

  const onBlur = useCallback(() => {
    if (reactNumberFormatConfig.number) {
      rerenderInput();
    }
    debounce();
  }, [debounce, reactNumberFormatConfig.number, rerenderInput]);

  const ariaLabel = overrideDisplay?.renderedInTable === true ? langAsString(textResourceBindings?.title) : undefined;

  return (
    <>
      {variant === 'search' ? (
        <SearchField
          id={id}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('simpleBinding', e.target.value)}
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
          onChange={(e) => setValue('simpleBinding', e.target.value)}
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
