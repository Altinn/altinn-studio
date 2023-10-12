import { Textfield } from '@digdir/design-system-react';
import React, { ReactNode, useState } from 'react';

export type DatePickerProps = {
  value: Date;
  onChange: (date: Date) => void;
  label: string;
  size?: 'xsmall' | 'small' | 'medium' | 'large';
};

/**
 * @component
 *    Displays a Date picker where the user can select a new date.
 *
 * @example
 *    const [date, setDate] = useState(new Date('2023-10-12'));
 *
 *    <DatePicker
 *      value={date}
 *      onChange={(newDate: Date) => setDate(newDate)}
 *      label='Select date'
 *    />
 *
 * @property {Date}[value] - The date to display
 * @property {function}[onChange] - Function that updates the date value
 * @property {string}[label] - The label of the component
 * @property {'xsmall' | 'small' | 'medium' | 'large'}[value] - the size of the component
 *
 * @returns {ReactNode} - The rendered component
 */
export const DatePicker = ({
  value,
  onChange,
  label,
  size = 'small',
}: DatePickerProps): ReactNode => {
  const [date, setDate] = useState(value.toISOString().split('T')[0]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
    onChange(new Date(e.target.value));
  };

  return <Textfield type='date' value={date} onChange={handleChange} label={label} size={size} />;
};
