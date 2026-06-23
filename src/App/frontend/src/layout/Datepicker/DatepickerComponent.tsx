import React from 'react';

import {
  ComponentStructure,
  DatePickerControl,
  DatePickerDropdownCaption,
  Flex,
  getDateConstraint,
  getDateFormat,
  LabelComponent,
} from '@app/form-component';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { getDatepickerFormat } from 'src/utils/dateUtils';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useLabelData } from 'src/utils/layout/useLabelData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function DatepickerComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Datepicker'>) {
  const { langAsString } = useLanguage();
  const languageLocale = useCurrentLanguage();
  const {
    minDate,
    maxDate,
    format,
    timeStamp = true,
    readOnly,
    required,
    id,
    dataModelBindings,
    grid,
    autocomplete,
  } = useItemWhenType(baseComponentId, 'Datepicker');

  const calculatedMinDate = getDateConstraint(minDate, 'min');
  const calculatedMaxDate = getDateConstraint(maxDate, 'max');
  const dateFormat = getDatepickerFormat(getDateFormat(format, languageLocale));

  const { setValue, formData } = useDataModelBindings(dataModelBindings);
  const value = formData.simpleBinding;

  const handleInputValueChange = (isoDateString: string) => {
    setValue('simpleBinding', isoDateString);
  };

  const labelData = useLabelData({ baseComponentId, overrideDisplay });
  const {
    id: contentId,
    innerGrid,
    validationGrid,
    showValidationMessages,
  } = useComponentStructureData(baseComponentId);

  return (
    <LabelComponent
      htmlFor={id}
      grid={grid?.labelGrid}
      {...labelData}
    >
      <ComponentStructure
        id={contentId}
        innerGrid={innerGrid}
        validationGrid={validationGrid}
        validationMessages={
          showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
        }
      >
        <Flex
          container
          item
          size={{ xs: 12 }}
        >
          <DatePickerControl
            id={id}
            value={value}
            dateFormat={dateFormat}
            timeStamp={timeStamp}
            onValueChange={handleInputValueChange}
            readOnly={readOnly}
            required={required}
            locale={languageLocale}
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
            autoComplete={autocomplete}
          />
        </Flex>
      </ComponentStructure>
    </LabelComponent>
  );
}
