import React from 'react';

import { SearchField } from '@altinn/altinn-design-system';
import { TextField } from '@digdir/design-system-react';

import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import { useMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IInputFormatting } from 'src/layout/layout';

export type IInputProps = PropsFromGenericComponent<'Input'>;

export function InputComponent({
  node,
  isValid,
  formData,
  handleDataChange,
  overrideDisplay,
  getTextResourceAsString,
}: IInputProps) {
  const { id, readOnly, required, formatting, variant, textResourceBindings, saveWhileTyping, autocomplete } =
    node.item;
  const { value, setValue, saveValue, onPaste } = useDelayedSavedState(
    handleDataChange,
    formData?.simpleBinding ?? '',
    saveWhileTyping,
  );
  const reactNumberFormatConfig = useMapToReactNumberConfig(formatting as IInputFormatting, value);
  const handleChange = (e) => setValue(e.target.value);

  const ariaLabel =
    overrideDisplay?.renderedInTable === true ? getTextResourceAsString(textResourceBindings?.title) : undefined;

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
        <TextField
          id={id}
          onBlur={saveValue}
          onChange={handleChange}
          onPaste={onPaste}
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
