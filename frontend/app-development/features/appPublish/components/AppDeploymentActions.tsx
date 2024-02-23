import React, { useState } from 'react';
import classes from './AppDeploymentActions.module.css';
import { DeployDropdown } from './DeployDropdown';
import { useCreateDeploymentMutation } from '../../../hooks/mutations';
import { Trans, useTranslation } from 'react-i18next';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import type { ImageOption } from './ImageOption';
import { BuildResult } from 'app-shared/types/Build';
import { toast } from 'react-toastify';
import { Alert, Link } from '@digdir/design-system-react';

export interface AppDeploymentActionsProps {
  appDeployedVersion: string;
  inProgress: boolean;
  deployPermission: boolean;
  envName: string;
  imageOptions: ImageOption[];
  orgName: string;
}

export const AppDeploymentActions = ({
  appDeployedVersion,
  inProgress,
  deployPermission,
  envName,
  imageOptions,
  orgName,
}: AppDeploymentActionsProps) => {
  const [selectedImageTag, setSelectedImageTag] = useState(null);
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();
  const { data, mutate, isPending } = useCreateDeploymentMutation(org, app, {
    hideDefaultError: true,
  });

  const startDeploy = () =>
    mutate(
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

  const deployIsPending = isPending || (data?.build?.result === BuildResult.none && !inProgress);
  const deployInProgress = deployIsPending || inProgress;

  if (!imageOptions.length) return null;

  return (
    <div className={classes.appDeploymentActions}>
      {!deployPermission ? (
        <Alert severity='info'>{t('app_publish.missing_rights', { envName, orgName })}</Alert>
      ) : (
        <DeployDropdown
          appDeployedVersion={appDeployedVersion}
          envName={envName}
          disabled={!selectedImageTag || deployInProgress}
          isPending={deployIsPending}
          inProgress={deployInProgress}
          selectedImageTag={selectedImageTag}
          imageOptions={imageOptions}
          setSelectedImageTag={setSelectedImageTag}
          startDeploy={startDeploy}
        />
      )}
    </div>
  );
};
