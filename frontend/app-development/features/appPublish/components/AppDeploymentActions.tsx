import React, { useState } from 'react';
import classes from './AppDeploymentActions.module.css';
import { StudioSpinner } from '@studio/components';
import { DeployDropdown } from './DeployDropdown';
import { useCreateDeploymentMutation } from '../../../hooks/mutations';
import { Trans, useTranslation } from 'react-i18next';
import { InformationSquareFillIcon } from '@navikt/aksel-icons';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import type { ImageOption } from './ImageOption';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import { BuildStatus } from 'app-shared/types/Build';
import { AppDeploymentStatus } from './AppDeploymentStatus';
import { toast } from 'react-toastify';
import { Link } from '@digdir/design-system-react';

export interface AppDeploymentActionsProps {
  pipelineDeploymentList?: PipelineDeployment[];
  deployPermission: boolean;
  envName: string;
  imageOptions: ImageOption[];
  orgName: string;
}

export const AppDeploymentActions = ({
  pipelineDeploymentList,
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
    mutation.mutate(
      {
        tagName: selectedImageTag,
        envName,
      },
      {
        onError: (): void => {
          toast.error(() => (
            <Trans
              i18nKey={'app_deploy_messages.technical_error_1'}
              components={{
                a: (
                  <Link href='/contact' inverted={true}>
                    {' '}
                  </Link>
                ),
              }}
            />
          ));
        },
      },
    );

  const latestPipelineDeployment = pipelineDeploymentList[0];
  const deployInProgress = latestPipelineDeployment?.build?.status === BuildStatus.inProgress;

  return (
    <div className={classes.dropdownGrid}>
      {!deployPermission ? (
        <div className={classes.deployStatusGridContainer}>
          <div className={classes.deploySpinnerGridItem}>
            <InformationSquareFillIcon />
          </div>
          <div>{t('app_publish.missing_rights', { envName, orgName })}</div>
        </div>
      ) : (
        <>
          {deployInProgress ? (
            <StudioSpinner spinnerText={t('app_publish.deployment_in_progress') + '...'} />
          ) : (
            <>
              {!deployInProgress && (
                <DeployDropdown
                  appDeployedVersion={latestPipelineDeployment?.tagName}
                  envName={envName}
                  disabled={selectedImageTag === null || deployInProgress === true}
                  selectedImageTag={selectedImageTag}
                  imageOptions={imageOptions}
                  setSelectedImageTag={setSelectedImageTag}
                  startDeploy={startDeploy}
                />
              )}
              <AppDeploymentStatus
                envName={envName}
                latestPipelineDeployment={latestPipelineDeployment}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};
