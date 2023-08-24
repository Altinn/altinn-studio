import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import classes from './ResourceDashboardPage.module.css';
import { Button, Spinner, Heading, Paragraph } from '@digdir/design-system-react';
import { PlusCircleIcon, MigrationIcon } from '@navikt/aksel-icons';
import { ResourceTable } from 'resourceadm/components/ResourceTable';
import { SearchBox } from 'resourceadm/components/ResourceSeachBox';
import { useGetResourceListQuery } from 'resourceadm/hooks/queries';
import { MergeConflictModal } from 'resourceadm/components/MergeConflictModal';
import { NewResourceModal } from 'resourceadm/components/NewResourceModal';
import { ImportResourceModal } from 'resourceadm/components/ImportResourceModal';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { filterTableData } from 'resourceadm/utils/resourceListUtils';

/**
 * @component
 *    Displays the page for the resource dashboard
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceDashboardPage = (): React.ReactNode => {
  const { selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;

  const [searchValue, setSearchValue] = useState('');
  const [hasMergeConflict, setHasMergeConflict] = useState(false);

  const [newResourceModalOpen, setNewResourceModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Get metadata with queries
  const { data: repoStatus, refetch } = useRepoStatusQuery(selectedContext, repo);
  const {
    data: resourceListData,
    isLoading: resourceListLoading,
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

  /**
   * Display different content based on the loading state
   */
  const displayContent = () => {
    if (resourceListLoading || refetchingList) {
      return (
        <div className={classes.spinnerWrapper}>
          <Spinner size='3xLarge' variant='interaction' title='Laster inn ressurser' />
        </div>
      );
    } else {
      return (
        <>
          <SearchBox onChange={(value: string) => setSearchValue(value)} />
          <div style={{ width: '100%' }}>
            <Heading size='xsmall' level={2}>
              {`Alle ressurser (${resourceListData?.length ?? 0})`}
            </Heading>
          </div>
          <ResourceTable list={filterTableData(searchValue, resourceListData ?? [])} />
          {filterTableData(searchValue, resourceListData ?? []).length === 0 && (
            <Paragraph size='small' className={classes.noResultText}>
              Det finnes ingen ressursen som har navnet du søkte etter.
            </Paragraph>
          )}
        </>
      );
    }
  };

  return (
    <div className={classes.pageWrapper}>
      <div className={classes.topWrapper}>
        <Heading size='large' level={1}>
          {`${selectedContext}'s ressurser`}
        </Heading>
        <div className={classes.topRightWrapper}>
          <Button
            variant='quiet'
            color='secondary'
            icon={<MigrationIcon title='Importer ressurs' />}
            iconPlacement='right'
            onClick={() => setImportModalOpen(true)}
            size='medium'
          >
            <strong>Importer ressurs</strong>
          </Button>
          <div className={classes.verticalDivider} />
          <Button
            variant='quiet'
            color='secondary'
            icon={<PlusCircleIcon title='Opprett ny ressurs' />}
            iconPlacement='right'
            onClick={() => setNewResourceModalOpen(true)}
            size='medium'
          >
            <strong>Opprett ny ressurs</strong>
          </Button>
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
        isOpen={newResourceModalOpen}
        onClose={() => setNewResourceModalOpen(false)}
      />
      <ImportResourceModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </div>
  );
};
