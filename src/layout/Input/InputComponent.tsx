import React from 'react';

import { SearchField } from '@altinn/altinn-design-system';
import { TextField } from '@digdir/design-system-react';

import { useDelayedSavedState } from 'src/components/hooks/useDelayedSavedState';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IInputFormatting } from 'src/layout/layout';

export type IInputProps = PropsFromGenericComponent<'Input'>;

export function InputComponent({
  id,
  readOnly,
  required,
  isValid,
  formData,
  formatting,
  handleDataChange,
  variant,
  textResourceBindings,
  saveWhileTyping,
  autocomplete,
}: IInputProps) {
  const { value, setValue, saveValue, onPaste } = useDelayedSavedState(
    handleDataChange,
    formData?.simpleBinding ?? '',
    saveWhileTyping,
  );
  const handleChange = (e) => setValue(e.target.value);

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
          aria-describedby={textResourceBindings?.description ? `description-${id}` : undefined}
          formatting={formatting as IInputFormatting}
          autoComplete={autocomplete}
        />
      )}
    </>
  );
}
