import { Textfield, TextfieldProps } from '@digdir/design-system-react';
import React, { ReactNode } from 'react';

type TimePickerProps = Omit<TextfieldProps, 'type'>;

/**
 * @component
 *    Displays a Time picker where the user can select a new time.
 *
 * @example
 *    const [time, setTime] = useState('09:48');
 *
 *    <TimePicker
 *      value={time}
 *      onChange={(e) => setTime(e.target.value)}
 *      label='Select time'
 *      size='small'
 *    />
 *
 * @returns {ReactNode} - The rendered component
 */
export const TimePicker = (props: TimePickerProps): ReactNode => {
  return <Textfield type='time' {...props} />;
};
