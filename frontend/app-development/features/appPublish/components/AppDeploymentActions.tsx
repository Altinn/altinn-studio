import React, { useState } from 'react';
import { DeployDropdown } from './DeployDropdown';
import { useCreateDeploymentMutation } from '../../../hooks/mutations';
import { Trans, useTranslation } from 'react-i18next';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import type { ImageOption } from './ImageOption';
import { toast } from 'react-toastify';
import { Alert, Link } from '@digdir/design-system-react';

export interface AppDeploymentActionsProps {
  appDeployedVersion: string;
  lastBuildId: string;
  inProgress: boolean;
  deployPermission: boolean;
  envName: string;
  imageOptions: ImageOption[];
  orgName: string;
}

export const AppDeploymentActions = ({
  appDeployedVersion,
  lastBuildId,
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

  if (!deployPermission) {
    return (
      <Alert severity='info'>{t('app_deployment.missing_rights', { envName, orgName })}</Alert>
    );
  }

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
              i18nKey={'app_deployment.technical_error_1'}
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

  const deployIsPending = isPending || (!!data?.build?.id && data?.build?.id !== lastBuildId);
  const deployInProgress = deployIsPending || inProgress;

  if (!imageOptions.length) return null;

  return (
    <DeployDropdown
      appDeployedVersion={appDeployedVersion}
      disabled={deployInProgress}
      isPending={deployIsPending}
      selectedImageTag={selectedImageTag}
      imageOptions={imageOptions}
      setSelectedImageTag={setSelectedImageTag}
      startDeploy={startDeploy}
    />
  );
};
