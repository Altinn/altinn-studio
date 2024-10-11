import React, { useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { Modal, Popover } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';
import { formatDate, isValid as isValidDate, parse, parseISO } from 'date-fns';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import styles from 'src/layout/Datepicker/Calendar.module.css';
import { DatePickerCalendar } from 'src/layout/Datepicker/DatePickerCalendar';
import { DatePickerInput } from 'src/layout/Datepicker/DatePickerInput';
import { getDateConstraint, getDateFormat, getLocale, getSaveFormattedDateString } from 'src/utils/dateHelpers';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

import 'react-day-picker/style.css';

export type IDatepickerProps = PropsFromGenericComponent<'Datepicker'>;

export function DatepickerComponent({ node }: IDatepickerProps) {
  const { langAsString } = useLanguage();
  const languageLocale = useCurrentLanguage();
  const currentLocale = getLocale(languageLocale ?? 'nb');
  const { minDate, maxDate, format, timeStamp = true, readOnly, required, id, dataModelBindings } = useNodeItem(node);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);

  const calculatedMinDate = getDateConstraint(minDate, 'min');
  const calculatedMaxDate = getDateConstraint(maxDate, 'max');
  const dateFormat = getDateFormat(format || 'dd.MM.yyyy', languageLocale);
  const isMobile = useIsMobile();

  const { setValue, formData } = useDataModelBindings(dataModelBindings);
  const value = formData.simpleBinding;
  const selectedDate = isValidDate(parseISO(value)) ? parseISO(value) : new Date();

  const handleDayPickerSelect = (date: Date) => {
    if (date && isValidDate(date)) {
      setValue('simpleBinding', getSaveFormattedDateString(date, timeStamp));
    }
    modalRef.current?.close();
    setIsDialogOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parse(e.target.value, dateFormat, new Date());
    if (isValidDate(parsed)) {
      setValue('simpleBinding', getSaveFormattedDateString(parsed, timeStamp));
    } else {
      setValue('simpleBinding', e.target.value ?? '');
    }
  };

  const renderModal = (trigger: ReactNode, content: ReactNode) =>
    isMobile ? (
      <>
        {trigger}
        <Modal
          role='dialog'
          ref={modalRef}
          onInteractOutside={() => modalRef.current?.close()}
          style={{ width: 'fit-content', minWidth: 'fit-content' }}
        >
          <Modal.Content>{content}</Modal.Content>
        </Modal>
      </>
    ) : (
      <Popover
        portal={false}
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        size='lg'
        placement='top'
      >
        <Popover.Trigger
          onClick={() => setIsDialogOpen(!isDialogOpen)}
          asChild={true}
        >
          {trigger}
        </Popover.Trigger>
        <Popover.Content
          className={styles.calendarWrapper}
          aria-modal
          autoFocus={true}
        >
          {content}
        </Popover.Content>
      </Popover>
    );

  return (
    <ComponentStructureWrapper
      node={node}
      label={{ node, renderLabelAs: 'label', className: styles.datepickerLabelWrapper }}
    >
      <div className={styles.calendarGrid}>
        <Grid
          container
          item
          xs={12}
        >
          {renderModal(
            <DatePickerInput
              id={id}
              value={value}
              isDialogOpen={isMobile ? modalRef.current?.open : isDialogOpen}
              formatString={dateFormat}
              onBlur={handleInputChange}
              onClick={() => (isMobile ? modalRef.current?.showModal() : setIsDialogOpen(!isDialogOpen))}
              readOnly={readOnly}
            />,
            <DatePickerCalendar
              id={id}
              locale={languageLocale}
              selectedDate={selectedDate}
              isOpen={isDialogOpen}
              onSelect={handleDayPickerSelect}
              minDate={calculatedMinDate}
              maxDate={calculatedMaxDate}
              required={required}
              autoFocus={isMobile}
            />,
          )}
        </Grid>
        <span className={styles.formatText}>
          {langAsString('date_picker.format_text', [formatDate(new Date(), dateFormat, { locale: currentLocale })])}
        </span>
      </div>
    </ComponentStructureWrapper>
  );
}
