import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import classes from './ResourceDashboardPage.module.css';
import { Button, Spinner, Heading } from '@digdir/design-system-react';
import { PlusCircleIcon, MigrationIcon } from '@navikt/aksel-icons';
import { ResourceTable } from 'resourceadm/components/ResourceTable';
import { SearchBox } from 'resourceadm/components/ResourceSeachBox';
import { ResourceType } from 'resourceadm/types/global';
import { useGetResourceListQuery } from 'resourceadm/hooks/queries';
import { MergeConflictModal } from 'resourceadm/components/MergeConflictModal';
import { NewResourceModal } from 'resourceadm/components/NewResourceModal';
import { MigrateResourceModal } from 'resourceadm/components/MigrateResourceModal';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';

/**
 * Displays the page for the resource dashboard
 */
export const ResourceDashboardPage = () => {
  const { selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;

  const [searchValue, setSearchValue] = useState('');
  const [hasMergeConflict, setHasMergeConflict] = useState(false);

  const [newResourceModalOpen, setNewResourceModalOpen] = useState(false);
  const [migrateModalOpen, setMigrateModalOpen] = useState(false);

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
   * Filter the list based on what is typed in the search box
   */
  const filteredTableData = (list: ResourceType[]) => {
    const searchValueLower = searchValue.toLocaleLowerCase();

    return list.filter((resource: ResourceType) => {
      const titles = Object.values(resource.title).map((title) => title.toLocaleLowerCase());
      return titles.some((titleString) => titleString.includes(searchValueLower));
    });
  };

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
          <ResourceTable list={filteredTableData(resourceListData ?? [])} />
          {filteredTableData(resourceListData ?? []).length === 0 && (
            <p className={classes.noResultText}>
              Det finnes ingen ressursen som har navnet du søkte etter.
            </p>
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
            icon={<MigrationIcon title='Migrer ressurs' />}
            iconPlacement='right'
            onClick={() => setMigrateModalOpen(true)}
            size='medium'
          >
            <strong>Migrer ressurs</strong>
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
      <MigrateResourceModal isOpen={migrateModalOpen} onClose={() => setMigrateModalOpen(false)} />
    </div>
  );
};
