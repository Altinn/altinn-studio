import React from 'react';

import { Flex } from 'src/app-components/Flex/Flex';
import { Label } from 'src/app-components/Label/Label';
import { TimePicker as TimePickerControl } from 'src/app-components/TimePicker/TimePicker';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useLabel } from 'src/utils/layout/useLabel';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function TimePickerComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'TimePicker'>) {
  const {
    minTime,
    maxTime,
    format = 'HH:mm',
    readOnly,
    required,
    id,
    dataModelBindings,
    grid,
  } = useItemWhenType(baseComponentId, 'TimePicker');

  const { setValue, formData } = useDataModelBindings(dataModelBindings);
  const value = formData.simpleBinding || '';
  const { langAsString } = useLanguage();

  // Create translated labels for segments
  const segmentLabels = {
    hours: langAsString('timepicker.hours') || 'Hours',
    minutes: langAsString('timepicker.minutes') || 'Minutes',
    seconds: langAsString('timepicker.seconds') || 'Seconds',
    amPm: langAsString('timepicker.am_pm') || 'AM/PM',
  };

  const handleTimeChange = (timeString: string) => {
    setValue('simpleBinding', timeString);
  };

  const { labelText, getRequiredComponent, getOptionalComponent, getHelpTextComponent, getDescriptionComponent } =
    useLabel({ baseComponentId, overrideDisplay });

  return (
    <Label
      htmlFor={id}
      label={labelText}
      grid={grid?.labelGrid}
      required={required}
      requiredIndicator={getRequiredComponent()}
      optionalIndicator={getOptionalComponent()}
      help={getHelpTextComponent()}
      description={getDescriptionComponent()}
    >
      <ComponentStructureWrapper baseComponentId={baseComponentId}>
        <Flex
          container
          item
          size={{ xs: 12 }}
        >
          <TimePickerControl
            id={id}
            value={value}
            onChange={handleTimeChange}
            format={format}
            minTime={minTime}
            maxTime={maxTime}
            disabled={readOnly}
            readOnly={readOnly}
            labels={segmentLabels}
          />
        </Flex>
      </ComponentStructureWrapper>
    </Label>
  );
}
