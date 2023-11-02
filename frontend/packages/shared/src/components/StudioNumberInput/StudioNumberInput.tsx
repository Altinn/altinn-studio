import React, { useEffect, useRef, useState } from 'react';
import { Textfield } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

export interface StudioNumberInputProps {
  description: string;
}

export const StudioNumberInput = ({ description }: StudioNumberInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const [clicked, setClicked] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const validateNumber = (value: string) => {
    const numberRegex = /^[0-9]+(\.[0-9]*)?$/;
    return clicked && !numberRegex.test(value) ? t('validation_errors.numbers_only') : undefined;
  };

  const handleOutsideClick = (e: MouseEvent) => {
    if (inputRef.current && !(inputRef.current as any).contains(e.target)) {
      setClicked(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    if (!isNaN(Number(input)) || input === '') {
      setInputValue(input);
    }
    setClicked(true);
  };

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
