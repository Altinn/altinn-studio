import React, { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { StudioDialog, StudioButton, StudioHeading, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './NavigationWarningDialog.module.css';
import { useBlocker } from 'react-router-dom';
import { getCurrentSettingsTab } from 'app-development/features/appSettings/utils';

export type NavigationWarningDialogProps = {
  hasContentChanged: boolean;
};

export function NavigationWarningDialog({
  hasContentChanged,
}: NavigationWarningDialogProps): ReactElement {
  const { t } = useTranslation();
  // const showNavigationModal: boolean = useBeforeUnload(updatedAppResource !== appResource);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    // const appResourceChanged = updatedAppResource !== appResource;
    const pathnamechanged = currentLocation.pathname !== nextLocation.pathname;
    const nextTabIsDifferentFromCurrentTab = !nextLocation.search.includes(getCurrentSettingsTab());

    return hasContentChanged && (pathnamechanged || nextTabIsDifferentFromCurrentTab);
  });

  return (
    <StudioDialog
      open={
        // true
        blocker.state === 'blocked'
      }
    >
      <StudioDialog.Block>
        <StudioHeading level={2}>
          {t('app_settings.navigation_warning_dialog_header')}
        </StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block>
        <StudioParagraph>{t('app_settings.navigation_warning_dialog_text')}</StudioParagraph>
        <div className={classes.buttonWrapper}>
          <StudioButton
            variant='primary'
            onClick={() => {
              blocker.reset();
            }}
          >
            {t('app_settings.navigation_warning_dialog_proceed_button')}
          </StudioButton>
          <StudioButton
            variant='secondary'
            data-color='danger'
            onClick={() => {
              blocker.proceed();
            }}
          >
            {t('app_settings.navigation_warning_dialog_cancel_button')}
          </StudioButton>
        </div>
      </StudioDialog.Block>
    </StudioDialog>
  );
}
