import React, { useState } from 'react';
import cn from 'classnames';
import classes from './ResourceTable.module.css';
import { CaretDownFillIcon, CaretUpFillIcon } from '@navikt/aksel-icons';
import { ResourceTableDataRow } from './ResourceTableDataRow';
import { Button } from '@digdir/design-system-react';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { useTranslation } from 'react-i18next'

export type ResourceTableProps = {
  /**
   * The list to display in the table
   */
  list: ResourceListItem[];
  /**
   * Function to be executed when clicking the edit resoruce
   * @param id the id of the resource
   * @returns void
   */
  onClickEditResource: (id: string) => void;
};

/**
 * @component
 *    Table to display a list of all resources available
 *
 * @property {ResourceListItem[]}[list] - The list to display in the table
 * @property {function}[onClickEditResource] - Function to be executed when clicking the edit resoruce
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceTable = ({ list, onClickEditResource }: ResourceTableProps): React.ReactNode => {
  const { t } = useTranslation();

  const [isSortedByNewest, setIsSortedByNewest] = useState(true);

  /**
   * Displays a row for each resource in the list
   */
  const displayRows = list.map((resource: ResourceListItem) => {
    return (
      <ResourceTableDataRow
        key={resource.identifier}
        resource={resource}
        onClickEditResource={() => {
          onClickEditResource(resource.identifier)
        }}
      />
    )
  });

  const handleSortTable = () => {
    setIsSortedByNewest((prev) => !prev);
    return list.reverse();
  };

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
                  <CaretDownFillIcon />
                ) : (
                  <CaretUpFillIcon  />
                )
              }
              onClick={handleSortTable}
              iconPlacement='right'
              color='secondary'
              size='small'
            >
              {t('resourceadm.dashboard_table_header_last_changed')}
            </Button>
          </th>
          <th className={cn(classes.tableHeaderMedium, classes.tableHeader)}>{t('resourceadm.dashboard_table_header_policy_rules')}</th>
          <th
            className={cn(classes.tableHeaderSmall, classes.tableHeader)}
            aria-label={t('resourceadm.dashboard_table_header_edit')}
          />
        </tr>
        {displayRows}
      </tbody>
    </table>
  );
};
