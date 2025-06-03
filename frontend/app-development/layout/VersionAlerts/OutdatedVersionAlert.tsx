import React, { useState } from 'react';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import { useLocalStorage } from '@studio/components-legacy';
import { StudioDialog, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  MAXIMUM_SUPPORTED_FRONTEND_VERSION,
  MAXIMUM_SUPPORTED_BACKEND_VERSION,
  MINIMUM_SUPPORTED_FRONTEND_VERSION,
  MINIMUM_SUPPORTED_BACKEND_VERSION,
} from 'app-shared/constants';
import classes from './OutdatedVersionAlert.module.css';
import { OutdatedVersionAlertRemindChoiceDialog } from './OutdatedVersionAlertRemindChoiceDialog';
import { VersionAlert } from './VersionAlert';
import { isBelowSupportedVersion } from './utils';

export const OutdatedVersionAlert = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data } = useAppVersionQuery(org, app);
  const { t } = useTranslation();
  const [hideOutdatedVersionDialog, setHideOutdatedVersionDialog] = useLocalStorage(
    'hideOutdatedVersionDialog',
    false,
  );
  const [opened, setOpened] = useState(!hideOutdatedVersionDialog);

  if (hideOutdatedVersionDialog) {
    return;
  }

  const isFrontendUnsupported = isBelowSupportedVersion(
    data?.frontendVersion,
    MINIMUM_SUPPORTED_FRONTEND_VERSION,
  );
  const isBackendUnsupported = isBelowSupportedVersion(
    data?.backendVersion,
    MINIMUM_SUPPORTED_BACKEND_VERSION,
  );

  if (isFrontendUnsupported || isBackendUnsupported) {
    return;
  }

  const isFrontendOutdated = isBelowSupportedVersion(
    data?.frontendVersion,
    MAXIMUM_SUPPORTED_FRONTEND_VERSION,
  );
  const isBackendOutdated = isBelowSupportedVersion(
    data?.backendVersion,
    MAXIMUM_SUPPORTED_BACKEND_VERSION,
  );

  if (!isFrontendOutdated && !isBackendOutdated) {
    return;
  }

  return (
    <StudioDialog data-color='warning' open={opened} className={classes.dialog} closeButton={false}>
      <OutdatedVersionAlertRemindChoiceDialog
        closeDialog={() => setOpened(false)}
        closeDialogPermanently={() => setHideOutdatedVersionDialog(true)}
      />
      <StudioDialog.Block className={classes.text}>
        <VersionAlert title={t('version_alerts.outdated_version_title')} className={classes.alert}>
          {t('version_alerts.outdated_version_title_content')
            .split('\n')
            .map((tr) => (
              <StudioParagraph key={tr}>{tr}</StudioParagraph>
            ))}
        </VersionAlert>
      </StudioDialog.Block>
    </StudioDialog>
  );
};
