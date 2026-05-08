import React, { createContext, useContext, useEffect, useRef } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';

import { Dialog, Popover } from '@digdir/designsystemet-react';

import styles from 'src/app-components/Datepicker/Calendar.module.css';
import { useIsMobile } from 'src/app-components/hooks/useDeviceWidths';

const DatePickerCloseContext = createContext<(() => void) | null>(null);

export function useDatePickerClose() {
  return useContext(DatePickerCloseContext);
}

type DatePickerDialogProps = {
  id: string;
  buttonAriaLabel: string;
  readOnly: boolean;
  trigger: ReactNode;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
};

export function DatePickerDialog({
  id,
  buttonAriaLabel,
  readOnly,
  children,
  trigger,
  isDialogOpen,
  setIsDialogOpen,
}: PropsWithChildren<DatePickerDialogProps>) {
  const isMobile = useIsMobile();
  const modalRef = useRef<HTMLDialogElement>(null);
  const closeDatepicker = () => setIsDialogOpen(false);

  useEffect(() => {
    isDialogOpen && modalRef.current?.showModal();
    !isDialogOpen && modalRef.current?.close();
  }, [isMobile, isDialogOpen]);

  if (isMobile) {
    return (
      <Dialog.TriggerContext>
        <Dialog.Trigger
          id={`${id}-button`}
          variant='tertiary'
          icon
          onClick={() => setIsDialogOpen(!isDialogOpen)}
          aria-label={buttonAriaLabel}
          disabled={readOnly}
          data-size='sm'
        >
          {trigger}
        </Dialog.Trigger>
        <DatePickerCloseContext.Provider value={closeDatepicker}>
          <Dialog
            ref={modalRef}
            role='dialog'
            aria-hidden={!isDialogOpen}
            closedby='any'
            modal
            closeButton={false}
            className={styles.datepickerModal}
            onClose={closeDatepicker}
          >
            <div className={styles.datepickerModalContent}>{children}</div>
          </Dialog>
        </DatePickerCloseContext.Provider>
      </Dialog.TriggerContext>
    );
  }
  return (
    <Popover.TriggerContext>
      <Popover.Trigger
        id={`${id}-button`}
        variant='tertiary'
        icon
        onClick={() => setIsDialogOpen(!isDialogOpen)}
        aria-label={buttonAriaLabel}
        disabled={readOnly}
        data-size='sm'
      >
        {trigger}
      </Popover.Trigger>
      <Popover
        className={styles.calendarWrapper}
        aria-modal
        aria-hidden={!isDialogOpen}
        role='dialog'
        open={isDialogOpen}
        data-size='lg'
        placement='top'
        autoFocus={true}
        onClose={closeDatepicker}
      >
        {children}
      </Popover>
    </Popover.TriggerContext>
  );
}
