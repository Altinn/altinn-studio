import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import classes from './ResourceDashboardPage.module.css';
import { PlusCircleIcon, MigrationIcon, TasklistIcon } from '@studio/icons';
import { Spinner, Heading } from '@digdir/design-system-react';
import { ResourceTable } from 'resourceadm/components/ResourceTable';
import { SearchBox } from 'resourceadm/components/ResourceSeachBox';
import { useGetResourceListQuery, useOrganizationsQuery } from 'resourceadm/hooks/queries';
import { MergeConflictModal } from 'resourceadm/components/MergeConflictModal';
import { NewResourceModal } from 'resourceadm/components/NewResourceModal';
import { ImportResourceModal } from 'resourceadm/components/ImportResourceModal';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { filterTableData } from 'resourceadm/utils/resourceListUtils';
import { useTranslation } from 'react-i18next';
import { getResourceDashboardURL, getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { getReposLabel } from 'dashboard/utils/repoUtils';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { useUrlParams } from 'resourceadm/hooks/useSelectedContext';
import { StudioButton } from '@studio/components';

/**
 * @component
 *    Displays the page for the resource dashboard
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceDashboardPage = (): React.ReactNode => {
  const createResourceModalRef = useRef<HTMLDialogElement>(null);
  const { selectedContext, repo } = useUrlParams();
  const { data: organizations } = useOrganizationsQuery();

  const { t } = useTranslation();

  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState('');
  const [hasMergeConflict, setHasMergeConflict] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);

  // Get metadata with queries
  const { data: repoStatus, refetch } = useRepoStatusQuery(selectedContext, repo);
  const {
    data: resourceListData,
    isPending: resourceListPending,
    isRefetching: refetchingList,
  } = useGetResourceListQuery(selectedContext);

  /**
   * Updates the value for if there is a merge conflict when the repostatus is not undefined
   */
  useEffect(() => {
    if (repoStatus) {
      setHasMergeConflict(repoStatus.hasMergeConflict);
    }
  }, [repoStatus]);

  const filteredResourceList = filterTableData(searchValue, resourceListData ?? []);

  const handleNavigateToResource = (id: string) => {
    navigate(getResourcePageURL(selectedContext, repo, id, 'about'));
  };
  /**
   * Display different content based on the loading state
   */
  const displayContent = () => {
    if (resourceListPending || refetchingList) {
      return (
        <div className={classes.spinnerWrapper}>
          <Spinner size='xlarge' variant='interaction' title={t('resourceadm.dashboard_spinner')} />
        </div>
      );
    } else {
      return (
        <>
          <SearchBox onChange={(value: string) => setSearchValue(value)} />
          <div>
            <Heading size='xsmall' level={2}>
              {t('resourceadm.dashboard_num_resources', { num: resourceListData?.length ?? 0 })}
            </Heading>
          </div>
          <ResourceTable
            list={filteredResourceList}
            onClickEditResource={handleNavigateToResource}
          />
        </>
      );
    }
  };

  return (
    <div className={classes.pageWrapper}>
      <div className={classes.topWrapper}>
        <Heading size='large' level={1}>
          {getReposLabel({
            selectedContext,
            orgs: organizations ? organizations : [],
            t,
            isResourcesRepo: true,
          })}
        </Heading>
        <div className={classes.topRightWrapper}>
          {shouldDisplayFeature('resourceAccessLists') && (
            <>
              <StudioButton
                as={Link}
                variant='tertiary'
                color='second'
                icon={<TasklistIcon />}
                iconPlacement='right'
                to={`${getResourceDashboardURL(selectedContext, repo)}/accesslists`}
                size='medium'
              >
                <strong>{t('resourceadm.dashboard_change_organization_lists')}</strong>
              </StudioButton>
              <div className={classes.verticalDivider} />
            </>
          )}

          <StudioButton
            variant='tertiary'
            color='second'
            icon={<MigrationIcon />}
            iconPlacement='right'
            onClick={() => setImportModalOpen(true)}
            size='medium'
          >
            <strong>{t('resourceadm.dashboard_import_resource')}</strong>
          </StudioButton>
          <div className={classes.verticalDivider} />
          <StudioButton
            variant='tertiary'
            color='second'
            icon={<PlusCircleIcon />}
            iconPlacement='right'
            onClick={() => createResourceModalRef.current?.showModal()}
            size='medium'
          >
            <strong>{t('resourceadm.dashboard_create_resource')}</strong>
          </StudioButton>
        </div>
      </div>
      <div className={classes.horizontalDivider} />
      <div className={classes.componentWrapper}>{displayContent()}</div>
      {hasMergeConflict && (
        <MergeConflictModal
          isOpen={hasMergeConflict}
          handleSolveMerge={refetch}
          org={selectedContext}
          repo={repo}
        />
      )}
      <NewResourceModal
        ref={createResourceModalRef}
        onClose={() => createResourceModalRef.current?.close()}
      />
      <ImportResourceModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </div>
  );
};
