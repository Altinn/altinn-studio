import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import classes from './ResourceDashboardPage.module.css';
import { Button, Spinner, Heading } from '@digdir/design-system-react';
import { PlusCircleIcon, MigrationIcon } from '@navikt/aksel-icons';
import { ResourceTable } from 'resourceadm/components/ResourceTable';
import { SearchBox } from 'resourceadm/components/ResourceSeachBox';
import { useGetResourceListQuery, useOrganizationsQuery } from 'resourceadm/hooks/queries';
import { MergeConflictModal } from 'resourceadm/components/MergeConflictModal';
import { NewResourceModal } from 'resourceadm/components/NewResourceModal';
import { ImportResourceModal } from 'resourceadm/components/ImportResourceModal';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { filterTableData } from 'resourceadm/utils/resourceListUtils';
import { useTranslation } from 'react-i18next';
import { getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { getReposLabel } from 'dashboard/utils/repoUtils';

/**
 * @component
 *    Displays the page for the resource dashboard
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceDashboardPage = (): React.ReactNode => {
  const { selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;
  const { data: organizations } = useOrganizationsQuery();

  const { t } = useTranslation();

  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState('');
  const [hasMergeConflict, setHasMergeConflict] = useState(false);

  const importModalRef = useRef<HTMLDialogElement>(null);
  const newResourceModalRef = useRef<HTMLDialogElement>(null);
  const mergeConflictModalRef = useRef<HTMLDialogElement>(null);

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

  // Open the modal when there is a merge conflict
  useEffect(() => {
    if (hasMergeConflict && mergeConflictModalRef.current) {
      mergeConflictModalRef.current.showModal();
    }
  }, [hasMergeConflict]);

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
          <div style={{ width: '100%' }}>
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
          <Button
            variant='tertiary'
            color='second'
            icon={<MigrationIcon />}
            iconPlacement='right'
            onClick={() => importModalRef.current?.showModal()}
            size='medium'
          >
            <strong>{t('resourceadm.dashboard_import_resource')}</strong>
          </Button>
          <div className={classes.verticalDivider} />
          <Button
            variant='tertiary'
            color='second'
            icon={<PlusCircleIcon />}
            iconPlacement='right'
            onClick={() => newResourceModalRef.current?.showModal()}
            size='medium'
          >
            <strong>{t('resourceadm.dashboard_create_resource')}</strong>
          </Button>
        </div>
      </div>
      <div className={classes.horizontalDivider} />
      <div className={classes.componentWrapper}>{displayContent()}</div>
      <MergeConflictModal
        ref={mergeConflictModalRef}
        handleSolveMerge={refetch}
        org={selectedContext}
        repo={repo}
      />
      <NewResourceModal
        ref={newResourceModalRef}
        onClose={() => newResourceModalRef.current?.close()}
      />
      <ImportResourceModal ref={importModalRef} onClose={() => importModalRef.current?.close()} />
    </div>
  );
};
