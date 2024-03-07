import React, { useState } from 'react';
import { DeployDropdown } from './DeployDropdown';
import { useCreateDeploymentMutation } from '../../../hooks/mutations';
import { Trans, useTranslation } from 'react-i18next';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { toast } from 'react-toastify';
import { Alert, Link } from '@digdir/design-system-react';
import { useDeployPermissionsQuery } from 'app-development/hooks/queries';
import { StudioSpinner } from '@studio/components';

export interface AppDeploymentActionsProps {
  appDeployedVersion: string;
  lastBuildId: string;
  inProgress: boolean;
  envName: string;
  isProduction: boolean;
  orgName: string;
}

export const AppDeploymentActions = ({
  appDeployedVersion,
  lastBuildId,
  inProgress,
  envName,
  isProduction,
  orgName,
}: AppDeploymentActionsProps) => {
  const [selectedImageTag, setSelectedImageTag] = useState(null);
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();
  const {
    data: permissions,
    isPending: permissionsIsPending,
    isError: permissionsIsError,
  } = useDeployPermissionsQuery(org, app, { hideDefaultError: true });
  const { data, mutate, isPending } = useCreateDeploymentMutation(org, app, {
    hideDefaultError: true,
  });

  if (permissionsIsPending) {
    return (
      <StudioSpinner
        showSpinnerTitle={false}
        spinnerTitle={t('app_deployment.permission_checking')}
      />
    );
  }

  if (permissionsIsError)
    return <Alert severity='danger'>{t('app_deployment.permission_error')}</Alert>;

  const deployPermission =
    permissions.findIndex((e) => e.toLowerCase() === envName.toLowerCase()) > -1;

  if (!deployPermission) {
    const envTitle = isProduction
      ? t(`general.production_environment_alt`).toLowerCase()
      : `${t('general.test_environment_alt').toLowerCase()} ${envName?.toUpperCase()}`;
    return (
      <Alert severity='info'>{t('app_deployment.missing_rights', { envTitle, orgName })}</Alert>
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

  return (
    <DeployDropdown
      appDeployedVersion={appDeployedVersion}
      disabled={deployInProgress}
      isPending={deployIsPending}
      selectedImageTag={selectedImageTag}
      setSelectedImageTag={setSelectedImageTag}
      startDeploy={startDeploy}
    />
  );
};
