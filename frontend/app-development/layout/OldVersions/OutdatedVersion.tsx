import React, { useState } from 'react';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import { useLocalStorage } from '@studio/components-legacy';
import { StudioDialog, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  MAXIMUM_SUPPORTED_FRONTEND_VERSION,
  MAXIMUM_SUPPORTED_BACKEND_VERSION,
} from 'app-shared/constants';
import classes from './OutdatedVersion.module.css';
import { OutdatedVersionRemindChoiceDialog } from './OutdatedVersionRemindChoiceDialog';
import { VersionAlert } from './VersionAlert';
import { isBelowSupportedVersion } from './utils';

export const OutdatedVersion = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data } = useAppVersionQuery(org, app);
  const { t } = useTranslation();
  const [showOutdatedVersionDialog, setShowOutdatedVersionDialog] = useLocalStorage(
    'showOutdatedVersionDialog',
    true,
  );
  const [opened, setOpened] = useState(showOutdatedVersionDialog);

  if (!showOutdatedVersionDialog) {
    return false;
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
      <OutdatedVersionRemindChoiceDialog
        close={() => setOpened(false)}
        setShowOutdatedVersionDialog={() => setShowOutdatedVersionDialog(false)}
      />
      <StudioDialog.Block className={classes.text}>
        <VersionAlert title={t('versions.outdated_version')} className={classes.alert}>
          {t('versions.supported_old_version')
            .split('\n')
            .map((tr) => (
              <StudioParagraph key={tr}>{tr}</StudioParagraph>
            ))}
        </VersionAlert>
      </StudioDialog.Block>
    </StudioDialog>
  );
};
