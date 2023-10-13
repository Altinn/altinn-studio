import React from 'react';
import classes from './AppStatuses.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useEnvironmentsQuery, useOrgListQuery } from 'app-development/hooks/queries';
import { AltinnSpinner } from 'app-shared/components';
import { ICreateAppDeploymentEnvObject } from 'app-development/sharedResources/appDeployment/types';
import { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { AppStatus } from './AppStatus';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { Trans, useTranslation } from 'react-i18next';

export const AppStatuses = () => {
  const { org } = useStudioUrlParams();
  const { t } = useTranslation();

  const { data: environmentList = [], isLoading: envIsLoading } = useEnvironmentsQuery();
  const { data: orgs = { orgs: {} }, isLoading: orgsIsLoading } = useOrgListQuery();

  if (envIsLoading || orgsIsLoading) return <AltinnSpinner />;

  const deployEnvironments: ICreateAppDeploymentEnvObject[] = environmentList.filter(
    (env: DeployEnvironment) => orgs?.orgs[org]?.environments.includes(env.name),
  );

  if (!orgs.orgs[org] || !orgs.orgs[org].environments || !orgs.orgs[org].environments.length) {
    return (
      <Alert severity='warning' className={classes.alert}>
        <Heading level={2} size='small'>
          {t('app_publish.no_env_title')}
        </Heading>
        <Paragraph>
          <Trans i18nKey={'app_publish.no_env_1'}>
            <a href='mailto:tjenesteeier@altinn.no' />
          </Trans>
        </Paragraph>
        <Paragraph>
          <Trans i18nKey={'app_publish.no_env_2'}>
            <a target='_new' rel='noopener noreferrer' />
          </Trans>
        </Paragraph>
      </Alert>
    );
  }

  return (
    <div className={classes.appStatuses}>
      {deployEnvironments.map((deployEnvironment: DeployEnvironment) => {
        return (
          <AppStatus
            key={deployEnvironment.name}
            envName={deployEnvironment.name}
            envType={deployEnvironment.type}
          />
        );
      })}
    </div>
  );
};
