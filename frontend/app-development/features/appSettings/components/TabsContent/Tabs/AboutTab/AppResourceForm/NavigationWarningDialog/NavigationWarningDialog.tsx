import React from 'react';
import type { ReactElement } from 'react';
import { StudioDialog, StudioButton, StudioHeading, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './NavigationWarningDialog.module.css';
import { useBlocker } from 'react-router-dom';
import type { Blocker } from 'react-router-dom';
import { useCurrentSettingsTab } from 'app-development/features/appSettings/hooks/useCurrentSettingsTab';

export type NavigationWarningDialogProps = {
  hasContentChanged: boolean;
};

export function NavigationWarningDialog({
  hasContentChanged,
}: NavigationWarningDialogProps): ReactElement {
  const { t } = useTranslation();

  const { tabToDisplay } = useCurrentSettingsTab();

  const blocker: Blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const pathnamechanged = currentLocation.pathname !== nextLocation.pathname;

    const nextTabIsDifferentFromCurrentTab = !nextLocation.search.includes(tabToDisplay);

    return hasContentChanged && (pathnamechanged || nextTabIsDifferentFromCurrentTab);
  });

  const goBackToPage = (): void => {
    blocker.reset();
  };

  const deleteChangesAndNavigate = (): void => {
    blocker.proceed();
  };

  return (
    <StudioDialog open={blocker.state === 'blocked'}>
      <StudioDialog.Block>
        <StudioHeading level={2}>
          {t('app_settings.navigation_warning_dialog_header')}
        </StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block>
        <StudioParagraph>{t('app_settings.navigation_warning_dialog_text')}</StudioParagraph>
        <div className={classes.buttonWrapper}>
          <StudioButton variant='primary' onClick={goBackToPage}>
            {t('app_settings.navigation_warning_dialog_go_back_button')}
          </StudioButton>
          <StudioButton variant='secondary' data-color='danger' onClick={deleteChangesAndNavigate}>
            {t('app_settings.navigation_warning_dialog_delete_changes_button')}
          </StudioButton>
        </div>
      </StudioDialog.Block>
    </StudioDialog>
  );
}
