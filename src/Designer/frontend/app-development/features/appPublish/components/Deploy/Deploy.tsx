import React, { useState } from 'react';
import { DeployDropdown } from './DeployDropdown';
import { useCreateDeploymentMutation } from '../../../../hooks/mutations';
import { Trans, useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { toast } from 'react-toastify';
import { Alert, Link } from '@digdir/designsystemet-react';
import { useDeployPermissionsQuery } from '../../../../hooks/queries';
import { StudioError, StudioSpinner } from '@studio/components-legacy';

export interface DeployProps {
  appDeployedVersion: string;
  isDeploymentInProgress: boolean;
  envName: string;
  isProduction: boolean;
  orgName: string;
}

export const Deploy = ({
  appDeployedVersion,
  isDeploymentInProgress,
  envName,
  isProduction,
  orgName,
}: DeployProps) => {
  const [selectedImageTag, setSelectedImageTag] = useState(null);
  const { t } = useTranslation();

  const { org, app } = useStudioEnvironmentParams();
  const {
    data: permissions,
    isPending: permissionsIsPending,
    isError: permissionsIsError,
  } = useDeployPermissionsQuery(org, app, { hideDefaultError: true });
  const { mutate, isPending: isPendingCreateDeployment } = useCreateDeploymentMutation(org, app, {
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

  if (permissionsIsError) return <StudioError>{t('app_deployment.permission_error')}</StudioError>;

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
                  <Link href='/info/contact' inverted={true}>
                    {' '}
                  </Link>
                ),
              }}
            />
          ));
        },
      },
    );

  const deployInProgress: boolean = isPendingCreateDeployment || isDeploymentInProgress;

  return (
    <DeployDropdown
      appDeployedVersion={appDeployedVersion}
      disabled={deployInProgress}
      isPending={deployInProgress}
      selectedImageTag={selectedImageTag}
      setSelectedImageTag={setSelectedImageTag}
      startDeploy={startDeploy}
    />
  );
};
