import React, { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { Dialog, Dropdown } from '@digdir/designsystemet-react';
import { BulletListIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import type { Button } from '@digdir/designsystemet-react';

import { useUiConfigContext } from 'src/features/form/layout/UiConfigContext';
import { Lang } from 'src/features/language/Lang';
import { AppNavigation, AppNavigationHeading } from 'src/features/navigation/AppNavigation';
import classes from 'src/features/navigation/PopoverNavigation.module.css';
import { SIDEBAR_BREAKPOINT, useHasGroupedNavigation } from 'src/features/navigation/utils';
import { useBrowserWidth, useIsMobile } from 'src/hooks/useDeviceWidths';

export function PopoverNavigation(props: Parameters<typeof Button>[0]) {
  const hasGroupedNavigation = useHasGroupedNavigation();
  const { expandedWidth } = useUiConfigContext();
  const isScreenSmall = !useBrowserWidth((width) => width >= SIDEBAR_BREAKPOINT) || expandedWidth;

  if (!hasGroupedNavigation || !isScreenSmall) {
    return null;
  }

  return <InnerPopoverNavigation {...props} />;
}

function InnerPopoverNavigation(props: Parameters<typeof Button>[0]) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const dropdownStyle = useDynamicHeight(dropdownRef, isDialogOpen && !isMobile);

  useEffect(() => {
    isDialogOpen && modalRef.current?.showModal();
    !isDialogOpen && modalRef.current?.close();
  }, [isMobile, isDialogOpen]);

  const closeDialog = () => setIsDialogOpen(false);
  const toggleDialog = () => setIsDialogOpen((o) => !o);

  if (!isMobile) {
    return (
      <div>
        <Dropdown.TriggerContext>
          <Dropdown.Trigger
            data-testid='page-navigation-trigger'
            variant='secondary'
            data-color='accent'
            onClick={() => toggleDialog()}
            data-size='sm'
            {...props}
            className={cn({ [classes.popoverButtonActive]: isDialogOpen }, props.className)}
          >
            <BulletListIcon
              className={cn(classes.popoverButtonIcon, classes.popoverButtonIconMargin)}
              aria-hidden
            />
            <Lang id='navigation.form_pages' />
          </Dropdown.Trigger>
          <Dropdown
            ref={dropdownRef}
            data-testid='page-navigation-dialog'
            placement='bottom-start'
            autoFocus={true}
            autoPlacement={false}
            open={isDialogOpen}
            onClose={closeDialog}
            style={dropdownStyle}
          >
            <Dropdown.Heading asChild>
              <AppNavigationHeading
                showClose={true}
                onClose={closeDialog}
              />
            </Dropdown.Heading>
            <div style={{ paddingRight: 12 }}>
              <AppNavigation onNavigate={closeDialog} />
            </div>
          </Dropdown>
        </Dropdown.TriggerContext>
      </div>
    );
  }

  return (
    <Dialog.TriggerContext>
      <Dialog.Trigger
        data-testid='page-navigation-trigger'
        onClick={toggleDialog}
        variant='secondary'
        daata-color='accent'
        data-size='sm'
        {...props}
        className={cn({ [classes.popoverButtonActive]: isDialogOpen }, props.className)}
      >
        <BulletListIcon
          className={cn(classes.popoverButtonIcon, classes.popoverButtonIconMargin)}
          aria-hidden
        />
        <Lang id='navigation.form_pages' />
      </Dialog.Trigger>
      <Dialog
        aria-labelledby='app-navigation-heading'
        ref={modalRef}
        closedby='any'
        modal={true}
        onClose={() => closeDialog()}
        className={cn(classes.modal, classes.modalContainer)}
        data-testid='page-navigation-dialog'
      >
        <AppNavigationHeading
          showClose={false}
          onClose={closeDialog}
        />
        <div style={{ paddingRight: 12 }}>
          <AppNavigation onNavigate={closeDialog} />
        </div>
      </Dialog>
    </Dialog.TriggerContext>
  );
}

function useDynamicHeight(elementRef: React.RefObject<HTMLDivElement | null>, isActive: boolean): CSSProperties {
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!isActive || !elementRef.current) {
      return;
    }

    const updateMaxHeight = () => {
      const rect = elementRef.current?.getBoundingClientRect();
      if (rect) {
        const availableHeight = Math.max(0, window.innerHeight - rect.top - 20); // 20px margin, non-negative
        setMaxHeight(availableHeight);
      }
    };

    updateMaxHeight();

    const resizeObserver = new ResizeObserver(updateMaxHeight);
    if (elementRef.current) {
      resizeObserver.observe(elementRef.current);
    }

    window.addEventListener('resize', updateMaxHeight);
    window.addEventListener('scroll', updateMaxHeight, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateMaxHeight);
      window.removeEventListener('scroll', updateMaxHeight, true);
    };
  }, [isActive, elementRef]);

  return { maxHeight: maxHeight ? `${maxHeight}px` : undefined, overflowY: 'auto' };
}
