import React, { useState } from 'react';
import cn from 'classnames';
import classes from './ResourceTable.module.css';
import { CaretDownFillIcon, CaretUpFillIcon } from '@navikt/aksel-icons';
import { ResourceTableDataRow } from './ResourceTableDataRow';
import { Button } from '@digdir/design-system-react';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';

type ResourceTableProps = {
  /**
   * The list to display in the table
   */
  list: ResourceListItem[];
};

/**
 * @component
 *    Table to display a list of all resources available
 *
 * @property {ResourceListItem[]}[list] - The list to display in the table
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceTable = ({ list }: ResourceTableProps): React.ReactNode => {
  const [isSortedByNewest, setIsSortedByNewest] = useState(true);

  /**
   * Displays a row for each resource in the list
   */
  const displayRows = list.map((resource: ResourceListItem, key: number) => {
    return <ResourceTableDataRow key={key} resource={resource} />;
  });

  const handleSortTable = () => {
    setIsSortedByNewest((prev) => !prev);
    return list.reverse();
  };

  // TODO - translate
  return (
    <table className={classes.table}>
      <tbody>
        <tr>
          <th className={cn(classes.tableHeaderXLarge, classes.tableHeader)}>Ressurser</th>
          <th className={cn(classes.tableHeaderLarge, classes.tableHeader)}>Opprettet av</th>
          <th className={cn(classes.tableHeaderMedium, classes.tableHeaderLastChanged)}>
            <Button
              variant='quiet'
              icon={
                isSortedByNewest ? (
                  <CaretDownFillIcon title='Vis eldst først' />
                ) : (
                  <CaretUpFillIcon title='Vis nyest først' />
                )
              }
              onClick={handleSortTable}
              iconPlacement='right'
              color='secondary'
            >
              Sist endret
            </Button>
          </th>
          <th className={cn(classes.tableHeaderMedium, classes.tableHeader)}>Tilgangsregler</th>
          <th
            className={cn(classes.tableHeaderSmall, classes.tableHeader)}
            aria-label='Rediger ressurs kolonne'
          />
        </tr>
        {displayRows}
      </tbody>
    </table>
  );
};
