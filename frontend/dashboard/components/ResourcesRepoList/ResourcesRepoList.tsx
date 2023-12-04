import React from 'react';
import { RESOURCEADM_BASENAME } from 'app-shared/constants';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { ResourceTable } from 'resourceadm/components/ResourceTable';
import { useGetResourceListQuery } from 'resourceadm/hooks/queries/useGetResourceListQuery';
import { getResourceDashboardURL, getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { getReposLabel } from 'dashboard/utils/repoUtils';
import { Organization } from 'app-shared/types/Organization';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components';
import { Alert, Heading, Link } from '@digdir/design-system-react';
import { useSearchReposQuery } from 'dashboard/hooks/queries';
import { User } from 'app-shared/types/User';
import { getUidFilter } from 'dashboard/utils/filterUtils';

type ResourcesRepoListProps = {
  user: User;
  organizations: Organization[];
};

export const ResourcesRepoList = ({
  user,
  organizations,
}: ResourcesRepoListProps): React.ReactNode => {
  const { t } = useTranslation();
  const selectedContext = useSelectedContext();
  const repo = `${selectedContext}-resources`;

  const uid = getUidFilter({
    selectedContext,
    userId: user.id,
    organizations,
  });

  // check if the -resources repo exists before attempting to load resources and render <ResourceTable>
  const { data: resourcesRepos } = useSearchReposQuery({
    uid: uid as number,
    keyword: '-resources',
    page: 0,
  });

  const {
    data: resourceListData,
    isLoading: isLoadingResourceList,
    isError: isResourceListError,
  } = useGetResourceListQuery(selectedContext, !resourcesRepos?.data.length);

  if (!resourcesRepos?.data.length) {
    return null;
  }

  if (isResourceListError) {
    return <Alert severity='danger'>{t('dashboard.resource_list_load_error')}</Alert>;
  }

  return (
    <div>
      <Heading level={2} size='small' spacing>
        {getReposLabel({
          selectedContext,
          orgs: organizations,
          t,
          isResourcesRepo: true,
        })}
      </Heading>
      {isLoadingResourceList ? (
        <StudioSpinner spinnerText={t('general.loading')} />
      ) : (
        <div data-testid='resource-table-wrapper'>
          <Link href={`${RESOURCEADM_BASENAME}${getResourceDashboardURL(selectedContext, repo)}`}>
            {t('dashboard.go_to_resources')}
          </Link>
          <ResourceTable
            list={resourceListData}
            onClickEditResource={(id: string) => {
              // we have to do a hard navigation (without react-router) to load the correct script files
              const resourceUrl = getResourcePageURL(selectedContext, repo, id, 'about');
              window.location.assign(`${RESOURCEADM_BASENAME}${resourceUrl}`);
            }}
          />
        </div>
      )}
    </div>
  );
};
