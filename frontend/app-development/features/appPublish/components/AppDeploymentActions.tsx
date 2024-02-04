import React, { useState } from 'react';
import classes from './AppDeployment.module.css';
import { StudioSpinner } from '@studio/components';
import { DeployDropdown } from './deploy/DeployDropdown';
import { useCreateDeploymentMutation } from '../../../hooks/mutations';
import { useTranslation } from 'react-i18next';
import { InformationSquareFillIcon } from '@navikt/aksel-icons';

import type { IDeployment } from '../../../sharedResources/appDeployment/types';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { DeploymentStatus } from './DeploymentStatus';
import type { ImageOption } from './ImageOption';

export interface AppDeploymentActionsProps {
  deployHistory?: IDeployment[];
  deployPermission: boolean;
  envName: string;
  imageOptions: ImageOption[];
  orgName: string;
}

export const AppDeploymentActions = ({
  deployHistory,
  deployPermission,
  envName,
  imageOptions,
  orgName,
}: AppDeploymentActionsProps) => {
  const [selectedImageTag, setSelectedImageTag] = useState(null);
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();
  const mutation = useCreateDeploymentMutation(org, app, { hideDefaultError: true });
  const startDeploy = () =>
    mutation.mutate({
      tagName: selectedImageTag,
      envName,
    });

  const latestDeploy = deployHistory ? deployHistory[0] : null;
  const deployInProgress = latestDeploy?.status === DeploymentStatus.progressing;

  return (
    <div className={classes.dropdownGrid}>
      {!deployPermission && (
        <div className={classes.deployStatusGridContainer}>
          <div className={classes.deploySpinnerGridItem}>
            <InformationSquareFillIcon />
          </div>
          <div>{t('app_publish.missing_rights', { envName, orgName })}</div>
        </div>
      )}
      {deployPermission && imageOptions.length > 0 && !deployInProgress && (
        <DeployDropdown
          appDeployedVersion={latestDeploy ? latestDeploy.tagName : undefined}
          envName={envName}
          disabled={selectedImageTag === null || deployInProgress === true}
          deployHistoryEntry={latestDeploy}
          deploymentStatus={latestDeploy?.status}
          selectedImageTag={selectedImageTag}
          imageOptions={imageOptions}
          setSelectedImageTag={setSelectedImageTag}
          startDeploy={startDeploy}
        />
      )}
      {deployInProgress && (
        <StudioSpinner spinnerText={t('app_publish.deployment_in_progress') + '...'} />
      )}
    </div>
  );
};
