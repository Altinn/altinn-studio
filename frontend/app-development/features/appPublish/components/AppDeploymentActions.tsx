import React, { useState } from 'react';
import classes from './AppDeploymentActions.module.css';
import { StudioSpinner } from '@studio/components';
import { DeployDropdown } from './deploy/DeployDropdown';
import { useCreateDeploymentMutation } from '../../../hooks/mutations';
import { useTranslation } from 'react-i18next';
import { InformationSquareFillIcon } from '@navikt/aksel-icons';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import type { ImageOption } from './ImageOption';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import { PipelineDeploymentBuildStatus } from 'app-shared/types/api/PipelineDeploymentBuild';

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
    mutation.mutate({
      tagName: selectedImageTag,
      envName,
    });

  // useEffect(() => {
  //   if (!deployPermission) return;
  //   if (mutation.isError) {
  //     toast.error(() => (
  //       <Trans
  //         i18nKey={'app_deploy_messages.technical_error_1'}
  //         components={{
  //           a: (
  //             <Link href='/contact' inverted={true}>
  //               {' '}
  //             </Link>
  //           ),
  //         }}
  //       />
  //     ));
  //   } else if (deployFailed) {
  //     toast.error(() =>
  //       t('app_deploy_messages.failed', {
  //         envName: latestDeploy.envName,
  //         tagName: latestDeploy.tagName,
  //         time: latestDeploy.build.started,
  //       }),
  //     );
  //   }
  // }, [deployPermission, deployFailed, t, latestDeploy, mutation.isError]);

  const latestDeploy = pipelineDeploymentList ? pipelineDeploymentList[0] : null;
  const deployInProgress = latestDeploy?.build?.status === PipelineDeploymentBuildStatus.inProgress;

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
