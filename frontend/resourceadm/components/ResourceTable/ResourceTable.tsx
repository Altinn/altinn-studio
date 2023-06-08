import React from 'react';
import classes from './ResourceTable.module.css';
import { CaretDownFillIcon, CaretUpFillIcon } from '@navikt/aksel-icons';
import { ResourceTableDataRow } from './ResourceTableDataRow';
import { Button } from '@digdir/design-system-react';
import { ResourceType } from 'resourceadm/types/global';

interface Props {
  list: ResourceType[];
  isSortedByNewest: boolean;
}

/**
 * Table to display a list of all resources available
 *
 * @param props.list the list to display in the table
 * @param props.isSortedByNewest flag for which way to sort the list
 */
export const ResourceTable = ({ list, isSortedByNewest }: Props) => {
  /**
   * Displays a row for each resource in the list
   */
  const displayRows = list.map((resource: ResourceType, key: number) => {
    return <ResourceTableDataRow key={key} resource={resource} />;
  });

  // TODO - translate
  return (
    <table className={classes.table}>
      <tbody>
        <tr>
          <th className={`${classes.tableHeaderLarge} ${classes.tableHeader}`}>
            <p className={classes.tableHeaderText}>Ressurser</p>
          </th>
          <th className={`${classes.tableHeaderLarge} ${classes.tableHeader}`}>
            <p className={classes.tableHeaderText}>Opprettet av</p>
          </th>
          <th className={`${classes.tableHeaderMedium} ${classes.tableHeaderLastChanged}`}>
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
          <th className={`${classes.tableHeaderMedium} ${classes.tableHeader}`}>
            <p className={classes.tableHeaderText}>Policy</p>
          </th>
          <th
            className={`${classes.tableHeaderMedium} ${classes.tableHeader}`}
            aria-label='Rediger ressurs kolonne'
          />
          <th
            className={`${classes.tableHeaderSmall} ${classes.tableHeader}`}
            aria-label='Se flere valg for ressursen'
          />
        </tr>
        {displayRows}
      </tbody>
    </table>
  );
};
