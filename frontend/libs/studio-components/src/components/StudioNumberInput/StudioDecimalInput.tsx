import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Textfield, TextfieldProps } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

export interface StudioDecimalInputProps extends Omit<TextfieldProps, 'onChange'> {
  description: string;
  onChange: (value: number) => void;
  value?: number;
}

export const StudioDecimalInput = ({
  description,
  onChange,
  value,
  ...rest
}: StudioDecimalInputProps) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [hasBeenBlurred, setHasBeenBlurred] = useState(false);
  const isEmpty = inputValue === '';

  useEffect(() => {
    if (!isEmpty && isStringValidDecimalNumber(inputValue)) {
      setInputValue(convertNumberToString(value));
    }
  }, [value]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      setInputValue(input);
      onChange(convertStringToNumber(input));
    },
    [setInputValue, onChange],
  );

  const errorMessage = useMemo(() => {
    const showErrorMessage = hasBeenBlurred && !isEmpty && !isStringValidDecimalNumber(inputValue);
    return showErrorMessage ? t('validation_errors.numbers_only') : undefined;
  }, [hasBeenBlurred, isEmpty, inputValue, t]);

  return (
    <Textfield
      description={description}
      value={inputValue}
      onChange={handleInputChange}
      error={errorMessage}
      onBlur={() => setHasBeenBlurred(true)}
      onFocus={() => setHasBeenBlurred(false)}
      inputMode='decimal'
      {...rest}
    />
  );
};

const isStringValidDecimalNumber = (value: string): boolean => {
  const numberRegex = /^[0-9]+([.,][0-9]*)?$/;
  return numberRegex.test(value);
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const convertStringToNumber = (value: string): number => Number(value.replace(',', '.'));

// eslint-disable-next-line @typescript-eslint/naming-convention
export const convertNumberToString = (value: number): string => value.toString().replace('.', ',');
