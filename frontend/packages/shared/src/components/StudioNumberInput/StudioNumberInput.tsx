import React, { useEffect, useRef, useState } from 'react';
import { Textfield } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

export interface StudioNumberInputProps {
  description: string;
  onChange: (value: number) => void;
}

export const StudioNumberInput = ({ description, onChange }: StudioNumberInputProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [clicked, setClicked] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    if (!isNaN(Number(input)) || input === '') {
      setInputValue(input);
    }
    setClicked(true);
    onChange(Number(input));
  };

  const validateNumber = (value: string) => {
    const numberRegex = /^[0-9]+(\.[0-9]*)?$/;
    return clicked && !numberRegex.test(value) ? t('validation_errors.numbers_only') : undefined;
  };

  const handleOutsideClick = (e: MouseEvent) => {
    if (inputRef.current && !inputRef.current?.contains(e.target as Node)) {
      setClicked(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  return (
    <div ref={inputRef}>
      <Textfield
        description={description}
        value={inputValue}
        onChange={handleInputChange}
        error={validateNumber(inputValue)}
      />
    </div>
  );
};
