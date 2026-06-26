import type { ReactNode } from 'react';

import { Flex } from '@app/form-component/app-components/Flex';
import { TimePicker as TimePickerControl } from '@app/form-component/app-components/Timepicker';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { LabelComponent } from '@app/form-component/layout-components/common/LabelComponent';
import type { IGridStyling } from '@app/form-component/app-components/Flex';
import type { TimeFormat } from '@app/form-component/app-components/Timepicker';

export interface TimePickerLayoutProps {
  /** The component id used as the input's `id` and label's `htmlFor`. */
  id: string;
  /** The indexed component ID for the form-content wrapper. */
  componentId?: string;
  /** The current time value string. */
  value: string;
  /** Called when the user changes the time. */
  onChange?: (timeString: string) => void;
  /** Time display format. */
  format?: TimeFormat;
  /** Minimum allowed time (e.g. "08:00"). */
  minTime?: string;
  /** Maximum allowed time (e.g. "17:00"). */
  maxTime?: string;
  /** Whether the control is read-only. */
  readOnly?: boolean;
  /** Whether the field is required. */
  required?: boolean;
  /** Text-resource key for the label. */
  title?: string;
  /** Text-resource key for the help text. */
  help?: string;
  /** Text-resource key for the description. */
  description?: string;
  /** Whether to show the optional marking on the label. */
  showOptionalMarking?: boolean;
  /** Grid sizing for the label area. */
  labelGrid?: IGridStyling;
  /** Grid sizing for the inner content area. */
  innerGrid?: IGridStyling;
  /** Grid sizing for validation messages. */
  validationGrid?: IGridStyling;
  /** Pre-rendered validation messages from the app. */
  validationMessages?: ReactNode;
}

export function TimePickerLayout({
  id,
  componentId,
  value,
  onChange,
  format = 'HH:mm',
  minTime,
  maxTime,
  readOnly,
  required,
  title,
  help,
  description,
  showOptionalMarking,
  labelGrid,
  innerGrid,
  validationGrid,
  validationMessages,
}: TimePickerLayoutProps) {
  const { langAsString } = useTranslation();

  const segmentLabels = {
    hours: langAsString('timepicker.hours'),
    minutes: langAsString('timepicker.minutes'),
    seconds: langAsString('timepicker.seconds'),
    amPm: langAsString('timepicker.am_pm'),
  };

  return (
    <LabelComponent
      htmlFor={id}
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
          <TimePickerControl
            id={id}
            value={value}
            onChange={onChange ?? (() => {})}
            format={format}
            minTime={minTime}
            maxTime={maxTime}
            disabled={readOnly}
            readOnly={readOnly}
            labels={segmentLabels}
          />
        </Flex>
      </ComponentStructure>
    </LabelComponent>
  );
}
