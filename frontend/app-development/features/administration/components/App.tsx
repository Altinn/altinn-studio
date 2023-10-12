import React from 'react';
import classes from './App.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useEnvironmentsQuery, useOrgListQuery } from 'app-development/hooks/queries';
import { Trans, useTranslation } from 'react-i18next';
import { Accordion, Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { AltinnSpinner } from 'app-shared/components';
import { ICreateAppDeploymentEnvObject } from 'app-development/sharedResources/appDeployment/types';
import { AppStatus } from './AppStatus';
import { AppDeployments } from './AppDeployments';
import { DeployEnvironment } from 'app-shared/types/DeployEnvironment';

export const App = () => {
  const { org } = useStudioUrlParams();
  const { t } = useTranslation();

  const { data: environmentList = [], isLoading: envIsLoading } = useEnvironmentsQuery();
  const { data: orgs = { orgs: {} }, isLoading: orgsIsLoading } = useOrgListQuery();

  if (envIsLoading || orgsIsLoading) return <AltinnSpinner />;

  if (!orgs.orgs[org] || !orgs.orgs[org].environments || !orgs.orgs[org].environments.length) {
    return (
      <Alert severity='warning' className={classes.status}>
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

  const deployEnvironments: ICreateAppDeploymentEnvObject[] = environmentList.filter(
    (env: DeployEnvironment) => orgs?.orgs[org]?.environments.includes(env.name),
  );

  return (
    <div className={classes.app}>
      {deployEnvironments.map((deployEnvironment: DeployEnvironment) => {
        const deployEnvironmentType = deployEnvironment.type.toLowerCase();
        return (
          <Accordion key={deployEnvironment.name} className={classes.accordion}>
            <Accordion.Item className={classes.accordionItem} defaultOpen={true}>
              <Accordion.Header className={classes.accordionHeader} level={2}>
                {t(`general.${deployEnvironmentType}_environment`)}
                {deployEnvironmentType === 'test' && ` ${deployEnvironment.name.toUpperCase()}`}
              </Accordion.Header>
              <Accordion.Content className={classes.accordionContent}>
                <AppStatus envName={deployEnvironment.name} />
                <AppDeployments envName={deployEnvironment.name} />
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        );
      })}
    </div>
  );
};
