import React, { useEffect, useState } from 'react';
import { PatternFormat } from 'react-number-format';
import type { Ref } from 'react';

import { Textfield } from '@digdir/designsystemet-react';
import { format, isValid } from 'date-fns';

import styles from 'src/app-components/Datepicker/Calendar.module.css';
import {
  getSaveFormattedDateString,
  strictParseFormat,
  strictParseISO,
} from 'src/app-components/Datepicker/utils/dateHelpers';
import { dateFormatCanBeNumericInReactPatternFormat, getFormatAsPatternFormat } from 'src/utils/dateUtils';

export interface DatePickerInputProps {
  id: string;
  datepickerFormat: string;
  timeStamp: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  readOnly?: boolean;
  autoComplete?: 'bday';
}

function DatePickerInputRef(
  { id, value, datepickerFormat, timeStamp, onValueChange, readOnly, autoComplete }: DatePickerInputProps,
  ref: Ref<HTMLInputElement>,
) {
  const dateValue = strictParseISO(value);
  const formattedDateValue = dateValue ? format(dateValue, datepickerFormat) : value;
  const [inputValue, setInputValue] = useState(formattedDateValue ?? '');
  const numericMode = dateFormatCanBeNumericInReactPatternFormat(datepickerFormat);

  useEffect(() => {
    setInputValue(formattedDateValue ?? '');
  }, [formattedDateValue]);

  const saveValue = (e: React.ChangeEvent<HTMLInputElement>) => {
    const stringValue = e.target.value;
    const date = strictParseFormat(stringValue, datepickerFormat);
    const valueToSave = getSaveFormattedDateString(date, timeStamp) ?? stringValue;
    onValueChange && onValueChange(valueToSave);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const stringValue = e.target.value;
    setInputValue(stringValue);
    // If the date is valid, save immediately
    if (stringValue.length == 0 || isValid(strictParseFormat(stringValue, datepickerFormat))) {
      saveValue(e);
    }
  };

  return (
    <PatternFormat
      getInputRef={ref}
      format={getFormatAsPatternFormat(datepickerFormat)}
      customInput={Textfield}
      data-size='sm'
      mask='_'
      className={styles.calendarInput}
      type='text'
      id={id}
      value={inputValue}
      placeholder={datepickerFormat.toUpperCase()}
      onChange={handleChange}
      onBlur={saveValue}
      readOnly={readOnly}
      aria-readonly={readOnly}
      autoComplete={autoComplete}
      // May force a numerical input mode in mobile browsers
      inputMode={numericMode ? 'numeric' : 'text'}
      pattern={numericMode ? '[0-9]*' : undefined}
    />
  );
}

export const DatePickerInput = React.forwardRef(DatePickerInputRef);
DatePickerInput.displayName = 'DatePickerInput';
