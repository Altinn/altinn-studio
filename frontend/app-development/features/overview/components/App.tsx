import type { HTMLAttributes } from 'react';
import React from 'react';
import { useOrgListQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { Alert } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { RepoOwnedByPersonInfo } from './RepoOwnedByPersonInfo';
import { NoEnvironmentsAlert } from './NoEnvironmentsAlert';
import { AppDeployments } from './AppDeployments';

type AppProps = Pick<HTMLAttributes<HTMLDivElement>, 'className'>;

export const App = ({ className }: AppProps) => {
  const { org, app } = useStudioUrlParams();

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
    return <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('overview.app_loading')} />;
  }

  if (isOrgsError || repositoryIsError)
    return <Alert severity='danger'>{t('overview.app_error')}</Alert>;

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

  return <AppDeployments className={className} />;
};
