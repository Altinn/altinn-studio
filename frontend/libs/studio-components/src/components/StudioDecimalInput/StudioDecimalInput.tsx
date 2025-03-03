import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from 'react';
import { convertNumberToString, convertStringToNumber, isStringValidDecimalNumber } from './utils';
import { type StudioTextfieldProps, StudioTextfield } from '../StudioTextfield';
import type { Override } from '../../types/Override';

export type StudioDecimalInputProps = Override<
  {
    description?: string;
    onChange: (value: number | null) => void;
    value?: number;
    validationErrorMessage?: string;
  },
  StudioTextfieldProps
>;

export const StudioDecimalInput = forwardRef(
  (
    { description, onChange, value, validationErrorMessage, ...rest }: StudioDecimalInputProps,
    ref: RefObject<HTMLInputElement>,
  ) => {
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
      const newInputValue = convertNumberToString(value);
      setInputValue(newInputValue);
    }, [value]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        setInputValue(input);
        if (isStringValidDecimalNumber(input)) onChange(convertStringToNumber(input));
      },
      [setInputValue, onChange],
    );

    const errorMessage = useMemo(
      () => (!isStringValidDecimalNumber(inputValue) ? validationErrorMessage : undefined),
      [inputValue, validationErrorMessage],
    );

    return (
      <StudioTextfield
        description={description}
        value={inputValue}
        onChange={handleInputChange}
        error={errorMessage}
        inputMode='decimal'
        ref={ref}
        {...rest}
      />
    );
  },
);

StudioDecimalInput.displayName = 'StudioDecimalInput';
