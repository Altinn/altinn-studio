import type { ReactNode } from 'react';

import { DatePickerControl } from '@app/form-component/app-components/Datepicker';
import {
  getDateConstraint,
  getDateFormat,
  getDatepickerFormat,
} from '@app/form-component/app-components/Datepicker/utils/dateHelpers';
import { Flex } from '@app/form-component/app-components/Flex';
import { useCurrentLanguage, useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { LabelComponent } from '@app/form-component/layout-components/common/LabelComponent';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

import { DatePickerDropdownCaption } from './DatePickerDropdownCaption';

import 'react-day-picker/style.css';

export interface DatepickerProps {
  /** The configured component id (Studio "Komponent-ID"). Rendered as the input's `id` and the label's `htmlFor`. */
  componentId: string;
  value: string;
  /** Unicode date format from the component config. Falls back to the locale's short date format. */
  format?: string;
  /** Min date as an ISO string or a date flag (e.g. `today`). */
  minDate?: string;
  /** Max date as an ISO string or a date flag (e.g. `today`). */
  maxDate?: string;
  timeStamp?: boolean;
  readOnly?: boolean;
  required?: boolean;
  autoComplete?: 'bday';
  onValueChange: (isoDateString: string) => void;
  /** Grid sizing for the inner content. */
  innerGrid?: IGridStyling;
  /** Grid sizing for the validation messages. */
  validationGrid?: IGridStyling;
  /**
   * Rendered validation messages. The app owns validation, so it passes the already-rendered
   * messages in rather than this library reaching into app-specific validation state.
   */
  validationMessages?: ReactNode;
  /** Text-resource key for the label text. When undefined, no label is rendered. */
  title?: string;
  /** Text-resource key for the label help text. */
  help?: string;
  /** Text-resource key for the label description. */
  description?: string;
  /** Whether to show the optional marking on the label for non-required fields. */
  showOptionalMarking?: boolean;
  /** Grid sizing for the label. */
  labelGrid?: IGridStyling;
}

export function Datepicker({
  componentId,
  value,
  format,
  minDate,
  maxDate,
  timeStamp = true,
  readOnly,
  required,
  autoComplete,
  onValueChange,
  innerGrid,
  validationGrid,
  validationMessages,
  title,
  help,
  description,
  showOptionalMarking,
  labelGrid,
}: DatepickerProps) {
  const { langAsString } = useTranslation();
  const currentLanguage = useCurrentLanguage();

  const dateFormat = getDatepickerFormat(getDateFormat(format, currentLanguage));
  const calculatedMinDate = getDateConstraint(minDate, 'min');
  const calculatedMaxDate = getDateConstraint(maxDate, 'max');

  return (
    <LabelComponent
      htmlFor={componentId}
      title={title}
      help={help}
      description={description}
      required={required}
      readOnly={readOnly}
      showOptionalMarking={showOptionalMarking}
      grid={labelGrid}
    >
      <ComponentStructure
        componentId={componentId}
        innerGrid={innerGrid}
        validationGrid={validationGrid}
        validationMessages={validationMessages}
      >
        <Flex container item size={{ xs: 12 }}>
          <DatePickerControl
            id={componentId}
            value={value}
            dateFormat={dateFormat}
            timeStamp={timeStamp}
            onValueChange={onValueChange}
            readOnly={readOnly}
            required={required}
            locale={currentLanguage}
            minDate={calculatedMinDate}
            maxDate={calculatedMaxDate}
            DropdownCaption={(props) => (
              <DatePickerDropdownCaption
                {...props}
                minDate={calculatedMinDate}
                maxDate={calculatedMaxDate}
              />
            )}
            buttonAriaLabel={langAsString('date_picker.aria_label_icon')}
            calendarIconTitle={langAsString('date_picker.aria_label_icon')}
            autoComplete={autoComplete}
          />
        </Flex>
      </ComponentStructure>
    </LabelComponent>
  );
}
