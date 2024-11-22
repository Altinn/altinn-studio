import React, { useState } from 'react';

import { Grid } from '@material-ui/core';
import { CalendarIcon } from '@navikt/aksel-icons';
import { formatDate, isValid as isValidDate } from 'date-fns';

import { Button } from 'src/app-components/button/Button';
import { Label } from 'src/app-components/Label/Label';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import styles from 'src/layout/Datepicker/Calendar.module.css';
import { DatePickerCalendar } from 'src/layout/Datepicker/DatePickerCalendar';
import { DatePickerDialog } from 'src/layout/Datepicker/DatepickerDialog';
import { DatePickerInput } from 'src/layout/Datepicker/DatePickerInput';
import { getDateConstraint, getDateFormat, getSaveFormattedDateString, strictParseISO } from 'src/utils/dateHelpers';
import { getDatepickerFormat } from 'src/utils/formatDateLocale';
import { useLabel } from 'src/utils/layout/useLabel';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

import 'react-day-picker/style.css';

export type IDatepickerProps = PropsFromGenericComponent<'Datepicker'>;

export function DatepickerComponent({ node, overrideDisplay }: IDatepickerProps) {
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
    textResourceBindings,
    grid,
    labelSettings,
  } = useNodeItem(node);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const calculatedMinDate = getDateConstraint(minDate, 'min');
  const calculatedMaxDate = getDateConstraint(maxDate, 'max');
  const dateFormat = getDatepickerFormat(getDateFormat(format, languageLocale));
  const isMobile = useIsMobile();

  const { setValue, formData } = useDataModelBindings(dataModelBindings);
  const value = formData.simpleBinding;
  const dateValue = strictParseISO(value);
  const dayPickerDate = dateValue ? dateValue : new Date();

  const handleDayPickerSelect = (date: Date) => {
    if (date && isValidDate(date)) {
      setValue('simpleBinding', getSaveFormattedDateString(date, timeStamp));
    }
    setIsDialogOpen(false);
  };

  const handleInputValueChange = (isoDateString: string) => {
    setValue('simpleBinding', isoDateString);
  };

  const { labelText, getRequiredComponent, getOptionalComponent, getHelpTextComponent, getDescriptionComponent } =
    useLabel({
      overrideDisplay,
      textResourceBindings,
      readOnly,
      required,
      showOptionalMarking: !!labelSettings?.optionalIndicator,
    });

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
      <ComponentStructureWrapper node={node}>
        <div className={styles.calendarGrid}>
          <Grid
            container
            item
            xs={12}
          >
            <div className={styles.calendarInputWrapper}>
              <DatePickerInput
                id={id}
                value={value}
                datepickerFormat={dateFormat}
                timeStamp={timeStamp}
                onValueChange={handleInputValueChange}
                readOnly={readOnly}
              />
              <DatePickerDialog
                isDialogOpen={isDialogOpen}
                setIsDialogOpen={setIsDialogOpen}
                trigger={
                  <Button
                    id={`${id}-button`}
                    variant='tertiary'
                    icon={true}
                    aria-controls='dialog'
                    aria-haspopup='dialog'
                    onClick={() => setIsDialogOpen(!isDialogOpen)}
                    aria-expanded={isDialogOpen}
                    aria-label={langAsString('date_picker.aria_label_icon')}
                    disabled={readOnly}
                    color='first'
                  >
                    <CalendarIcon title={langAsString('date_picker.aria_label_icon')} />
                  </Button>
                }
              >
                <DatePickerCalendar
                  id={id}
                  locale={languageLocale}
                  selectedDate={dayPickerDate}
                  isOpen={isDialogOpen}
                  onSelect={handleDayPickerSelect}
                  minDate={calculatedMinDate}
                  maxDate={calculatedMaxDate}
                  required={required}
                  autoFocus={isMobile}
                />
              </DatePickerDialog>
            </div>
          </Grid>
          <span className={`${styles.formatText} no-visual-testing`}>
            {langAsString('date_picker.format_text', [formatDate(new Date(), dateFormat)])}
          </span>
        </div>
      </ComponentStructureWrapper>
    </Label>
  );
}
