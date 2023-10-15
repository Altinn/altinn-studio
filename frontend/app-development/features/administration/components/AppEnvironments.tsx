import React from 'react';
import classes from './AppEnvironments.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useEnvironmentsQuery, useOrgListQuery } from 'app-development/hooks/queries';
import { AltinnSpinner } from 'app-shared/components';
import { ICreateAppDeploymentEnvObject } from 'app-development/sharedResources/appDeployment/types';
import { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { AppStatus } from './AppStatus';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { Trans, useTranslation } from 'react-i18next';

export const AppEnvironments = () => {
  const { org } = useStudioUrlParams();
  const { t } = useTranslation();

  const { data: environmentList = [], isLoading: envIsLoading } = useEnvironmentsQuery();
  const { data: orgs = { orgs: {} }, isLoading: orgsIsLoading } = useOrgListQuery();

  if (envIsLoading || orgsIsLoading) return <AltinnSpinner />;

  const selectedOrg = orgs.orgs[org];
  const hasEnvironments = !(selectedOrg?.environments?.length ?? 0);

  if (hasEnvironments) {
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

  const orgEnvironments: ICreateAppDeploymentEnvObject[] = environmentList.filter(
    (env: DeployEnvironment) => selectedOrg.environments.includes(env.name),
  );

  return (
    <div className={classes.appEnvironments}>
      {orgEnvironments.map((orgEnvironment: DeployEnvironment) => {
        return (
          <AppStatus
            key={orgEnvironment.name}
            envName={orgEnvironment.name}
            envType={orgEnvironment.type}
          />
        );
      })}
    </div>
  );
};
