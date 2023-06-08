import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import classes from './ResourceDashboardPage.module.css';
import { Button, Spinner } from '@digdir/design-system-react';
import { PlusCircleIcon } from '@navikt/aksel-icons';
import { ResourceTable } from 'resourceadm/components/ResourceTable';
import { SearchBox } from 'resourceadm/components/ResourceSeachBox';
import { ResourceType } from 'resourceadm/types/global';
import { useOnce } from 'resourceadm/hooks/useOnce';
import { get } from 'app-shared/utils/networking';
import { getResourcesUrlBySelectedContext } from 'resourceadm/utils/backendUrlUtils';
import { mapResourceListBackendResultToResourceList } from 'resourceadm/utils/mapperUtils';

/**
 * Displays the page for the resource dashboard
 */
export const ResourceDashboardPage = () => {
  const { selectedContext } = useParams();

  const [searchValue, setSearchValue] = useState('');
  const [resourceList, setResourceList] = useState<ResourceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

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
            icon={<PlusCircleIcon title='Migrer ressurs' />}
            iconPlacement='right'
            onClick={() => {}}
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
    </div>
  );
};
