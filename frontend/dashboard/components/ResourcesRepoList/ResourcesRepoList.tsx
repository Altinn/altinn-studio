import React from 'react';
import { RESOURCEADM_BASENAME } from 'app-shared/constants';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { ResourceTable } from 'resourceadm/components/ResourceTable';
import { useGetResourceListQuery } from 'resourceadm/hooks/queries/useGetResourceListQuery';
import { getResourceDashboardURL, getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { getReposLabel } from 'dashboard/utils/repoUtils';
import { Organization } from 'app-shared/types/Organization';
import { useTranslation } from 'react-i18next';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { AltinnSpinner } from 'app-shared/components';
import { Heading } from '@digdir/design-system-react';

type ResourcesRepoListProps = {
  organizations: Organization[];
};

export const ResourcesRepoList = ({ organizations }: ResourcesRepoListProps): React.ReactNode => {
  const { t } = useTranslation();
  const selectedContext = useSelectedContext();
  const repo = `${selectedContext}-resources`;

  const isOrganization =
    selectedContext !== SelectedContextType.All && selectedContext !== SelectedContextType.Self;
  const { data: resourceListData, isLoading } = useGetResourceListQuery(
    selectedContext,
    !isOrganization,
  );

  if (!isOrganization) {
    return null;
  }

  return (
    <div data-testid='resource-table-wrapper'>
      <Heading level={2} size='small' spacing>
        {getReposLabel({
          selectedContext,
          orgs: organizations,
          t,
          isResourcesRepo: true,
        })}
      </Heading>
      {isLoading ? (
        <AltinnSpinner spinnerText={t('general.loading')} />
      ) : (
        <div>
          <a href={`${RESOURCEADM_BASENAME}${getResourceDashboardURL(selectedContext, repo)}`}>
            {t('dashboard.go_to_resources')}
          </a>
          <ResourceTable
            list={resourceListData || []}
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
