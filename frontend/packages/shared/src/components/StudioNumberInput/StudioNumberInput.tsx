import React, { useEffect, useRef, useState } from 'react';
import { Textfield } from '@digdir/design-system-react';

// -----------

// -----------

export interface StudioNumberInputProps {
  label: string;
}

export const StudioNumberInput = ({ label }: StudioNumberInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const [isTouched, setIsTouched] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);

  const validateNumber = (value: string) => {
    const numberRegex = /^[0-9]+$/;
    return isTouched && !numberRegex.test(value) ? 'Du må skrive et tall' : undefined;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    if (!isNaN(Number(input)) || input === '') {
      setInputValue(input);
    }
    setIsTouched(true);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (inputRef.current && !(inputRef.current as any).contains(e.target)) {
        setIsTouched(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);

    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  return (
    <div ref={inputRef}>
      <Textfield
        label={label}
        value={inputValue}
        onChange={handleInputChange}
        error={validateNumber(inputValue)}
      />
    </div>
  );
};
