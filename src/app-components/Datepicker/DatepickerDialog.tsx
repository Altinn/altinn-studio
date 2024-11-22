import React, { useEffect, useRef } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';

import { Modal, Popover } from '@digdir/designsystemet-react';

import styles from 'src/app-components/Datepicker/Calendar.module.css';
import { useIsMobile } from 'src/hooks/useDeviceWidths';

export function DatePickerDialog({
  children,
  trigger,
  isDialogOpen,
  setIsDialogOpen,
}: PropsWithChildren<{ trigger: ReactNode; isDialogOpen: boolean; setIsDialogOpen: (open: boolean) => void }>) {
  const isMobile = useIsMobile();
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    isDialogOpen && modalRef.current?.showModal();
    !isDialogOpen && modalRef.current?.close();
  }, [isMobile, isDialogOpen]);

  if (isMobile) {
    return (
      <>
        {trigger}
        <Modal
          role='dialog'
          ref={modalRef}
          onInteractOutside={() => setIsDialogOpen(false)}
          style={{ width: 'fit-content', minWidth: 'fit-content' }}
        >
          <Modal.Content>{children}</Modal.Content>
        </Modal>
      </>
    );
  }
  return (
    <Popover
      portal={true}
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
        {children}
      </Popover.Content>
    </Popover>
  );
}
