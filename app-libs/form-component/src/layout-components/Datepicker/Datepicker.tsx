import {
  DatePickerControl,
  Flex,
  getDateConstraint,
  getDateFormat,
  getDatepickerFormat,
} from '@app/form-component/app-components';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';

import { DropdownCaption } from './DropdownCaption';

import 'react-day-picker/style.css';

export interface DatepickerProps {
  id: string;
  value: string;
  /** Unicode date format from the component config. Falls back to the locale's short date format. */
  format?: string;
  locale: string;
  /** Min date as an ISO string or a date flag (e.g. `today`). */
  minDate?: string;
  /** Max date as an ISO string or a date flag (e.g. `today`). */
  maxDate?: string;
  timeStamp?: boolean;
  readOnly?: boolean;
  required?: boolean;
  autoComplete?: 'bday';
  onValueChange: (isoDateString: string) => void;
}

export function Datepicker({
  id,
  value,
  format,
  locale,
  minDate,
  maxDate,
  timeStamp = true,
  readOnly,
  required,
  autoComplete,
  onValueChange,
}: DatepickerProps) {
  const { langAsString } = useTranslation();

  const dateFormat = getDatepickerFormat(getDateFormat(format, locale));
  const calculatedMinDate = getDateConstraint(minDate, 'min');
  const calculatedMaxDate = getDateConstraint(maxDate, 'max');

  return (
    <Flex container item size={{ xs: 12 }}>
      <DatePickerControl
        id={id}
        value={value}
        dateFormat={dateFormat}
        timeStamp={timeStamp}
        onValueChange={onValueChange}
        readOnly={readOnly}
        required={required}
        locale={locale}
        minDate={calculatedMinDate}
        maxDate={calculatedMaxDate}
        DropdownCaption={(props) => (
          <DropdownCaption
            {...props}
            minDate={calculatedMinDate}
            maxDate={calculatedMaxDate}
            locale={locale}
          />
        )}
        buttonAriaLabel={langAsString('date_picker.aria_label_icon')}
        calendarIconTitle={langAsString('date_picker.aria_label_icon')}
        autoComplete={autoComplete}
      />
    </Flex>
  );
}
