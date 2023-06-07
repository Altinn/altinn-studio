import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import classes from './ResourceDashboard.module.css';
import { Button } from '@digdir/design-system-react';
import { PlusCircleIcon } from '@navikt/aksel-icons';
import { ResourceTable } from 'resourceadm/components/ResourceTable';
import { SearchBox } from 'resourceadm/components/ResourceSeachBox';
import { mockResources } from 'resourceadm/data-mocks/policies';
import { ResourceType } from 'resourceadm/types/global';
import { useOnce } from 'resourceadm/hooks/useOnce';

export const ResourceDashboard = () => {
  const { selectedContext } = useParams();

  const [searchValue, setSearchValue] = useState('');

  useOnce(() => {});

  const filteredTableData = mockResources.filter((resource: ResourceType) =>
    resource.name.toLowerCase().includes(searchValue.toLocaleLowerCase())
  );

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
      <div className={classes.componentWrapper}>
        <h2 className={classes.subheader}>{`Alle ressurser (${mockResources.length})`}</h2>
        <ResourceTable list={filteredTableData} isSortedByNewest={true} />
      </div>
    </div>
  );
};
