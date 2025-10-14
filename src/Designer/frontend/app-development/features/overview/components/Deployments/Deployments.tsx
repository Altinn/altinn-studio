import type { HTMLAttributes } from 'react';
import React from 'react';
import { useOrgListQuery } from 'app-development/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { StudioError } from '@studio/components-legacy';
import { StudioSpinner } from '@studio/components';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { RepoOwnedByPersonInfo } from './RepoOwnedByPersonInfo';
import { NoEnvironmentsAlert } from './NoEnvironmentsAlert';
import { DeploymentContainer } from './DeploymentContainer';

type DeploymentsProps = Pick<HTMLAttributes<HTMLDivElement>, 'className'>;

export const Deployments = ({ className }: DeploymentsProps) => {
  const { org, app } = useStudioEnvironmentParams();

  const {
    data: orgs,
    isPending: isOrgsPending,
    isError: isOrgsError,
  } = useOrgListQuery({ hideDefaultError: true });

  const {
    data: repository,
    isPending: repositoryIsPending,
    isError: repositoryIsError,
  } = useRepoMetadataQuery(org, app, { hideDefaultError: true });
  const selectedOrg = orgs?.[org];
  const hasNoEnvironments = !(selectedOrg?.environments?.length ?? 0);

  const { t } = useTranslation();

  if (isOrgsPending || repositoryIsPending) {
    return <StudioSpinner aria-hidden spinnerTitle={t('overview.deployments_loading')} />;
  }

  if (isOrgsError || repositoryIsError)
    return <StudioError>{t('overview.deployments_error')}</StudioError>;

  // If repo-owner is an organisation
  const repoOwnerIsOrg = orgs && Object.keys(orgs).includes(repository?.owner.login);

  if (!repoOwnerIsOrg) {
    return (
      <section className={className}>
        <RepoOwnedByPersonInfo />
      </section>
    );
  }

  if (hasNoEnvironments) {
    return (
      <section className={className}>
        <NoEnvironmentsAlert />
      </section>
    );
  }

  return <DeploymentContainer className={className} />;
};
