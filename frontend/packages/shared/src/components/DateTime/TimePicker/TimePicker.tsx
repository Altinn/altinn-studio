import { Textfield } from '@digdir/design-system-react';
import React, { ReactNode, useState } from 'react';

export type TimePickerProps = {
  value: string;
  onChange: (time: string) => void;
  label: string;
  size?: 'xsmall' | 'small' | 'medium' | 'large';
};

/**
 * @component
 *    Displays a Time picker where the user can select a new time.
 *
 * @example
 *    const [time, setTime] = useState('09:48');
 *
 *    <TimePicker
 *      value={time}
 *      onChange={(newTime: string) => setTime(newTime)}
 *      label='Select time'
 *    />
 *
 * @property {string}[value] - The time to display
 * @property {function}[onChange] - Function that updates the time value
 * @property {string}[label] - The label of the component
 * @property {'xsmall' | 'small' | 'medium' | 'large'}[value] - the size of the component
 *
 * @returns {ReactNode} - The rendered component
 */
export const TimePicker = ({
  value,
  onChange,
  label,
  size = 'small',
}: TimePickerProps): ReactNode => {
  const [date, setDate] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
    onChange(e.target.value);
  };

  return <Textfield type='time' value={date} onChange={handleChange} label={label} size={size} />;
};
