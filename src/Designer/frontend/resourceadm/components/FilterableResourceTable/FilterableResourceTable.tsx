import React, { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioHeading, StudioSwitch } from '@studio/components';
import classes from './FilterableResourceTable.module.css';
import { ResourceTable } from '../ResourceTable';
import type { ResourceTableProps } from '../ResourceTable/ResourceTable';
import { filterTableData } from '../../utils/resourceListUtils';

export type FilterableResourceTableProps = ResourceTableProps & {
  /**
   * The value typed in a search box, if any
   */
  searchValue?: string;
  /**
   * The level of the heading showing the number of resources
   */
  headingLevel: 2 | 3;
};

/**
 * @component
 *    Displays the resource table with a heading showing the number of displayed resources,
 *    and a switch for showing inactive resources, which are hidden by default
 */
export const FilterableResourceTable = ({
  list,
  searchValue = '',
  headingLevel,
  ...resourceTableProps
}: FilterableResourceTableProps): React.JSX.Element => {
  const { t } = useTranslation();
  const [showInactiveResources, setShowInactiveResources] = useState(false);

  const filteredResourceList = filterTableData(searchValue, list, showInactiveResources);

  const handleShowInactiveChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setShowInactiveResources(event.target.checked);
  };

  return (
    <>
      <div className={classes.tableHeader}>
        <StudioHeading data-size='xs' level={headingLevel}>
          {t('dashboard.resource_table_num_resources', { num: filteredResourceList.length })}
        </StudioHeading>
        <StudioSwitch
          data-size='sm'
          checked={showInactiveResources}
          onChange={handleShowInactiveChange}
          label={t('dashboard.resource_table_show_inactive')}
        />
      </div>
      <ResourceTable list={filteredResourceList} {...resourceTableProps} />
    </>
  );
};
