import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { StudioTextfield } from 'libs/studio-components/src';

type LanguageInputProps = {
  id: string;
  label: string;
  description?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  required: boolean;
  error: string[];
  tagText: string;
};

export type LanguageInputFieldProps = LanguageInputProps & {
  isTextArea?: boolean;
};

export function LanguageInputField({
  id,
  label,
  description,
  value,
  onChange,
  isTextArea = false,
  required,
  error,
  tagText,
}: LanguageInputFieldProps): ReactElement {
  if (isTextArea) {
    return (
      <LanguageTextArea
        id={id}
        label={label}
        description={description}
        value={value}
        onChange={onChange}
        required={required}
        error={error}
        tagText={tagText}
      />
    );
  }
  return (
    <LanguageTextfield
      id={id}
      label={label}
      description={description}
      value={value}
      onChange={onChange}
      required={required}
      error={error}
      tagText={tagText}
    />
  );
}

function LanguageTextfield({ id, ...rest }: LanguageInputProps): ReactElement {
  return <StudioTextfield id={id} {...rest} />;
}

const NUMBER_OF_ROWS_IN_TEXTAREA: number = 3;

function LanguageTextArea({ id, ...rest }: LanguageInputProps): ReactElement {
  return <StudioTextfield id={id} rows={NUMBER_OF_ROWS_IN_TEXTAREA} multiline {...rest} />;
}
