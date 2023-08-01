import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import classes from './ResourceDashboardPage.module.css';
import { Button, Spinner } from '@digdir/design-system-react';
import { PlusCircleIcon } from '@navikt/aksel-icons';
import { ResourceTable } from 'resourceadm/components/ResourceTable';
import { SearchBox } from 'resourceadm/components/ResourceSeachBox';
import { NewResourceType, ResourceType } from 'resourceadm/types/global';
import { Footer } from 'resourceadm/components/Footer';
import { useGetResourceListQuery, useRepoStatusQuery } from 'resourceadm/hooks/queries';
import { MergeConflictModal } from 'resourceadm/components/MergeConflictModal';
import { NewResourceModal } from 'resourceadm/components/NewResourceModal';
import { getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { useCreateResourceMutation } from 'resourceadm/hooks/mutations';
import { MigrateResourceModal } from 'resourceadm/components/MigrateResourceModal';

/**
 * Displays the page for the resource dashboard
 */
export const ResourceDashboardPage = () => {
  const navigate = useNavigate();

  const { selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;

  const [searchValue, setSearchValue] = useState('');
  const [hasMergeConflict, setHasMergeConflict] = useState(false);

  const [newResourceModalOpen, setNewResourceModalOpen] = useState(false);
  const [migrateModalOpen, setMigrateModalOpen] = useState(false);

  const [resourceIdExists, setResourceIdExists] = useState(false);

  // Get metadata with queries
  const { data: repoStatus, refetch } = useRepoStatusQuery(selectedContext, repo);
  const { data: resourceListData, isLoading: resourceListLoading } =
    useGetResourceListQuery(selectedContext);

  // Mutation function to create new resource
  const { mutate: createNewResource } = useCreateResourceMutation(selectedContext);

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
   * Creates a new resource in backend, and navigates if success
   */
  const handleCreateNewResource = (id: string, title: string) => {
    const idAndTitle: NewResourceType = {
      identifier: id,
      title: {
        nb: title,
        nn: '',
        en: '',
      },
    };

    // TODO - Error handling on 409 conflict
    createNewResource(idAndTitle, {
      onSuccess: () =>
        navigate(getResourcePageURL(selectedContext, repo, idAndTitle.identifier, 'about')),
      onError: (error: any) => {
        if (error.response.status === 409) {
          setResourceIdExists(true);
        }
      },
    });
  };

  /**
   * Display different content based on the loading state
   */
  const displayContent = () => {
    if (resourceListLoading) {
      return (
        <div className={classes.spinnerWrapper}>
          <Spinner size='3xLarge' variant='interaction' title='Laster inn policy' />
        </div>
      );
    } else {
      return (
        <>
          <h2 className={classes.subheader}>{`Alle ressurser (${resourceListData.length})`}</h2>
          <ResourceTable list={filteredTableData(resourceListData)} />
        </>
      );
    }
  };

  return (
    <>
      <div className={classes.pageWrapper}>
        <div className={classes.topWrapper}>
          <h1>{`${selectedContext}'s ressurser`}</h1>
          <div className={classes.topRightWrapper}>
            <Button
              variant='quiet'
              color='secondary'
              icon={<PlusCircleIcon title='Migrer ressurs' />}
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
        <div className={classes.componentWrapper}>
          <SearchBox onChange={(value: string) => setSearchValue(value)} />
        </div>
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
          onCreateNewResource={handleCreateNewResource}
          resourceIdExists={resourceIdExists}
        />
        <MigrateResourceModal
          isOpen={migrateModalOpen}
          onClose={() => setMigrateModalOpen(false)}
          onPlanMigrate={() => {
            console.log('Migrating... Coming soon');
          }} // TODO when connected with API calls
          resourceIdExists={resourceIdExists}
        />
      </div>
      <Footer />
    </>
  );
};
