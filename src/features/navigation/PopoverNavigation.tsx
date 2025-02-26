import React, { useEffect, useRef, useState } from 'react';

import { Modal, Popover } from '@digdir/designsystemet-react';
import { BulletListIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import type { Button } from '@digdir/designsystemet-react';

import { useUiConfigContext } from 'src/features/form/layout/UiConfigContext';
import { Lang } from 'src/features/language/Lang';
import { AppNavigation, AppNavigationHeading } from 'src/features/navigation/AppNavigation';
import classes from 'src/features/navigation/PopoverNavigation.module.css';
import { SIDEBAR_BREAKPOINT, useHasGroupedNavigation } from 'src/features/navigation/utils';
import { useIsReceiptPage } from 'src/features/routing/AppRoutingContext';
import { useBrowserWidth, useIsMobile } from 'src/hooks/useDeviceWidths';

export function PopoverNavigation(props: Parameters<typeof Button>[0]) {
  const hasGroupedNavigation = useHasGroupedNavigation();
  const { expandedWidth } = useUiConfigContext();
  const isScreenSmall = !useBrowserWidth((width) => width >= SIDEBAR_BREAKPOINT) || expandedWidth;
  const isReceiptPage = useIsReceiptPage();

  if (!hasGroupedNavigation || !isScreenSmall || isReceiptPage) {
    return null;
  }

  return <InnerPopoverNavigation {...props} />;
}

function InnerPopoverNavigation(props: Parameters<typeof Button>[0]) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    isDialogOpen && modalRef.current?.showModal();
    !isDialogOpen && modalRef.current?.close();
  }, [isMobile, isDialogOpen]);

  const closeDialog = () => setIsDialogOpen(false);
  const toggleDialog = () => setIsDialogOpen((o) => !o);

  if (!isMobile) {
    return (
      <div className={classes.popoverWrapper}>
        <Popover
          open={isDialogOpen}
          onClose={closeDialog}
        >
          <Popover.Trigger
            data-testid='page-navigation-trigger'
            onClick={toggleDialog}
            variant='secondary'
            color='first'
            size='sm'
            {...props}
            className={cn({ [classes.popoverButtonActive]: isDialogOpen }, props.className)}
          >
            <PopoverNavigationButtonContent />
          </Popover.Trigger>
          <Popover.Content
            data-testid='page-navigation-dialog'
            className={classes.popoverContainer}
            aria-modal
            autoFocus={true}
          >
            <AppNavigationHeading
              showClose={true}
              onClose={closeDialog}
            />
            <div style={{ paddingRight: 12 }}>
              <AppNavigation onNavigate={closeDialog} />
            </div>
          </Popover.Content>
        </Popover>
      </div>
    );
  }

  return (
    <Modal.Root>
      <Modal.Trigger
        data-testid='page-navigation-trigger'
        onClick={toggleDialog}
        variant='secondary'
        color='first'
        size='sm'
        {...props}
        className={cn({ [classes.popoverButtonActive]: isDialogOpen }, props.className)}
      >
        <PopoverNavigationButtonContent />
      </Modal.Trigger>
      <Modal.Dialog
        aria-labelledby='app-navigation-heading'
        ref={modalRef}
        onInteractOutside={closeDialog}
        className={classes.modal}
      >
        <Modal.Content
          data-testid='page-navigation-dialog'
          className={classes.modalContainer}
        >
          <AppNavigationHeading
            showClose={true}
            onClose={closeDialog}
          />
          <div style={{ paddingRight: 12 }}>
            <AppNavigation onNavigate={closeDialog} />
          </div>
        </Modal.Content>
      </Modal.Dialog>
    </Modal.Root>
  );
}

function PopoverNavigationButtonContent() {
  return (
    <>
      <BulletListIcon
        className={cn(classes.popoverButtonIcon, classes.popoverButtonIconMargin)}
        aria-hidden
      />
      <Lang id='navigation.form_pages' />
    </>
  );
}
