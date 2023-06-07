import React from 'react';
import classes from './ResourceTable.module.css';
import { CaretDownFillIcon, CaretUpFillIcon } from '@navikt/aksel-icons';
import { ResourceTableDataRow } from './ResourceTableDataRow';
import { Button } from '@digdir/design-system-react';
import { ResourceType } from 'resourceadm/types/global';

interface Props {
  list: ResourceType[]; // TODO
  isSortedByNewest: boolean;
}

export const ResourceTable = ({ list, isSortedByNewest }: Props) => {
  const displayRows = list.map((resource: ResourceType, key: number) => {
    return <ResourceTableDataRow key={key} resource={resource} />;
  });

  return (
    <table className={classes.table}>
      <tbody>
        <tr>
          <th className={classes.tableHeader}>
            <p className={classes.tableHeaderText}>Ressurser</p>
          </th>
          {/* TODO - Refactor to own component? */}
          <th className={classes.tableHeader}>
            <p className={classes.tableHeaderText}>Opprettet av</p>
          </th>
          <th className={classes.tableHeaderLastChanged}>
            <Button
              variant='quiet'
              icon={
                isSortedByNewest ? (
                  <CaretDownFillIcon title='Vis eldst først' />
                ) : (
                  <CaretUpFillIcon title='Vis nyest først' />
                )
              }
              iconPlacement='right'
              color='secondary'
            >
              Sist endret
            </Button>
          </th>
          <th className={classes.tableHeader}>
            <p className={classes.tableHeaderText}>Policy</p>
          </th>
          <th className={classes.tableHeader} />
          <th className={classes.tableHeader} />
        </tr>
        {displayRows}
      </tbody>
    </table>
  );
};
