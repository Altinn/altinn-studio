import type { HTMLAttributes } from 'react';
import React from 'react';
import { useOrgListQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { Alert } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { AppEnvironments } from './AppEnvironments';
import { AppLogs } from './AppLogs';
import { StudioSpinner } from '@studio/components';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { RepoOwnedByPersonInfo } from './RepoOwnedByPersonInfo';

type AppProps = Pick<HTMLAttributes<HTMLDivElement>, 'className'>;

export const App = ({ className }: AppProps) => {
  const { org, app } = useStudioUrlParams();
  const {
    data: orgs,
    isPending: isPendingOrgs,
    isError: isOrgsError,
  } = useOrgListQuery({ hideDefaultError: true });

  const { data: repository } = useRepoMetadataQuery(org, app);
  const selectedOrg = orgs?.orgs[org];
  const hasEnvironments = selectedOrg?.environments?.length > 0;

  const { t } = useTranslation();

  if (isPendingOrgs) {
    return <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('overview.app_loading')} />;
  }

  if (isOrgsError) return <Alert severity='danger'>{t('overview.app_error')}</Alert>;

  // If repo-owner is an organisation
  const repoOwnerIsOrg = orgs && Object.keys(orgs.orgs).includes(repository?.owner.login);

  return repoOwnerIsOrg ? (
    <>
      <section className={className}>
        <AppEnvironments />
      </section>
      {hasEnvironments && (
        <section className={className}>
          <AppLogs />
        </section>
      )}
    </>
  ) : (
    <section className={className}>
      <RepoOwnedByPersonInfo />
    </section>
  );
};
