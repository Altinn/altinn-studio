import React, { useEffect, useState } from 'react';
import { PatternFormat } from 'react-number-format';

import { Textfield } from '@digdir/designsystemet-react';
import { format, isValid } from 'date-fns';

import styles from 'src/layout/Datepicker/Calendar.module.css';
import { getSaveFormattedDateString, strictParseFormat, strictParseISO } from 'src/utils/dateHelpers';
import { getFormatPattern } from 'src/utils/formatDateLocale';

export interface DatePickerInputProps {
  id: string;
  datepickerFormat: string;
  timeStamp: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  readOnly?: boolean;
}

export function DatePickerInput({
  id,
  value,
  datepickerFormat,
  timeStamp,
  onValueChange,
  readOnly,
}: DatePickerInputProps) {
  const formatPattern = getFormatPattern(datepickerFormat);
  const dateValue = strictParseISO(value);
  const formattedDateValue = dateValue ? format(dateValue, datepickerFormat) : value;
  const [inputValue, setInputValue] = useState(formattedDateValue ?? '');

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
      format={formatPattern}
      customInput={Textfield}
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
    />
  );
}
