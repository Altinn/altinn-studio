import React, { useState } from 'react';
import { Textfield } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

export interface StudioNumberInputProps {
  description: string;
  onChange: (value: number) => void;
}

export const StudioNumberInput = ({ description, onChange }: StudioNumberInputProps) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [showError, setShowError] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setInputValue(input);
    onChange(Number(input.replace(',', '.')));
  };

  const validateNumber = (value: string) => {
    const numberRegex = /^[0-9]+([.,][0-9]*)?$/;
    return showError && !numberRegex.test(value) ? t('validation_errors.numbers_only') : undefined;
  };

  const handleBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setShowError(true);
    if (input === '') {
      setShowError(false);
    }
  };

  return (
    <div>
      <Textfield
        description={description}
        value={inputValue}
        onChange={handleInputChange}
        error={validateNumber(inputValue)}
        onFocus={() => setShowError(false)}
        onBlur={handleBlur}
        inputMode='decimal'
      />
    </div>
  );
};
