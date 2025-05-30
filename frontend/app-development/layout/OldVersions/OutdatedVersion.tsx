import React, { useState } from 'react';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import { useLocalStorage } from '@studio/components-legacy';
import { StudioDialog, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { LATEST_FRONTEND_VERSION, LATEST_BACKEND_VERSION } from 'app-shared/constants';
import classes from './OutdatedVersion.module.css';
import { OutdatedVersionRemindChoiceDialog } from './OutdatedVersionRemindChoiceDialog';
import { VersionAlert } from './VersionAlert';

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

  const isFrontendOutdated =
    data?.frontendVersion?.slice(0, LATEST_FRONTEND_VERSION.length) < LATEST_FRONTEND_VERSION;
  const isBackendOutdated =
    data?.backendVersion?.slice(0, LATEST_BACKEND_VERSION.length) < LATEST_BACKEND_VERSION;

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
