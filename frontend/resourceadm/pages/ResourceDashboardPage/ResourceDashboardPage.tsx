import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import classes from './ResourceDashboardPage.module.css';
import { Button, Spinner } from '@digdir/design-system-react';
import { PlusCircleIcon } from '@navikt/aksel-icons';
import { ResourceTable } from 'resourceadm/components/ResourceTable';
import { SearchBox } from 'resourceadm/components/ResourceSeachBox';
import { ResourceType } from 'resourceadm/types/global';
import { useOnce } from 'resourceadm/hooks/useOnce';
import { get, post } from 'app-shared/utils/networking';
import {
  getCreateResourceUrlBySelectedContext,
  getResourcesUrlBySelectedContext,
} from 'resourceadm/utils/backendUrlUtils';
import { mapResourceListBackendResultToResourceList } from 'resourceadm/utils/mapperUtils';
import { Footer } from 'resourceadm/components/Footer';
import { useRepoStatusQuery } from 'resourceadm/hooks/queries';
import { MergeConflictModal } from 'resourceadm/components/MergeConflictModal';
import { NewResourceModal } from 'resourceadm/components/NewResourceModal';
import { getResourcePageURL } from 'resourceadm/utils/urlUtils';

/**
 * Displays the page for the resource dashboard
 */
export const ResourceDashboardPage = () => {
  const { selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;
  const repo = `${selectedContext}-resources`;

  const [searchValue, setSearchValue] = useState('');
  const [resourceList, setResourceList] = useState<ResourceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasMergeConflict, setHasMergeConflict] = useState(false);

  const [newResourceModalOpen, setNewResourceModalOpen] = useState(false);

  // Gets the repo status and the function to refetch it
  const { data: repoStatus, refetch } = useRepoStatusQuery(selectedContext, repo);

  /**
   * Updates the value for if there is a merge conflict when the repostatus is not undefined
   */
  useEffect(() => {
    if (repoStatus) {
      setHasMergeConflict(repoStatus.hasMergeConflict);
    }
  }, [repoStatus]);

  /**
   * Get the resources once the page loads
   */
  useOnce(() => {
    setLoading(true);

    get(getResourcesUrlBySelectedContext(selectedContext))
      .then((res: any) => {
        console.log(res);
        setResourceList(mapResourceListBackendResultToResourceList(res));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error getting the resources', err);
        setLoading(false);
        setHasError(true);
      });

    /**
     * IF you do not want to run agains backend, comment out the code above,
     * and comment in the code below. It will then work the same.
     */
    // setResourceList(mockResources);
  });

  /**
   * Filter the list based on what is typed in the search box
   */
  const filteredTableData = resourceList.filter((resource: ResourceType) =>
    resource.name.toLowerCase().includes(searchValue.toLocaleLowerCase())
  );

  const navigate = useNavigate();

  /**
   * Creates a new resource in backend
   */
  const handleCreateNewResource = (id: string, title: string) => {
    // TODO - API call to backend to add resource
    const idAndTitle = {
      identifier: id,
      title: {
        nb: title,
      },
    };

    post(getCreateResourceUrlBySelectedContext(selectedContext), idAndTitle)
      .then((res) => {
        console.log('res', res);
        navigate(getResourcePageURL(selectedContext, repo, idAndTitle.identifier, 'about'));
      })
      .catch((err) => {
        console.error('Error posting the new resource', err);
      });
  };

  /**
   * Display different content based on the loading state
   */
  const displayContent = () => {
    if (loading) {
      return (
        <div className={classes.spinnerWrapper}>
          <Spinner size='3xLarge' variant='interaction' title='Laster inn policy' />
        </div>
      );
    }
    // TODO error handling
    if (hasError) {
      return <p>Beklager, det skjedde en feil under innhenting av innholdet</p>;
    }
    return (
      <>
        <h2 className={classes.subheader}>{`Alle ressurser (${resourceList.length})`}</h2>
        <ResourceTable list={filteredTableData} isSortedByNewest={true} />
      </>
    );
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
              onClick={() => {}}
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
        />
      </div>
      <Footer />
    </>
  );
};
