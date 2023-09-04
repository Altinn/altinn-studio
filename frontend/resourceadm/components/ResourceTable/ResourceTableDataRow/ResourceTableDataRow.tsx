import React from 'react';
import cn from 'classnames';
import classes from './ResourceTableDataRow.module.css';
import { Button, Tag, Paragraph } from '@digdir/design-system-react';
import { PencilWritingIcon } from '@navikt/aksel-icons';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { useTranslation } from 'react-i18next'

export type ResourceTableDataRowProps = {
  /**
   * The resource to display in the row
   */
  resource: ResourceListItem;
  /**
   * Function to be executed when clicking the edit resoruce
   * @returns void
   */
  onClickEditResource: () => void
};

/**
 * @component
 *    Display the row in the resource table. It displays values for
 *    name, created by, the date changed, if it has policy or not, as well as
 *    two buttons, one for editing a resource, and one for doing more actions
 *
 * @property {Resource}[resource] - The resource to display in the row
 * @property {function}[onClickEditResource] - Function to be executed when clicking the edit resoruce
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceTableDataRow = ({ resource, onClickEditResource }: ResourceTableDataRowProps): React.ReactNode => {
  const { t } = useTranslation();

  return (
    <tr style={{ width: '100%' }}>
      <td className={cn(classes.tableDataXLarge, classes.tableData)}>
        {/* TODO - Fix translation of title */}
        <Paragraph size='small'>
          {resource.title['nb'] === '' ? t('resourceadm.dashboard_table_row_missing_title') : resource.title['nb']}
        </Paragraph>
      </td>
      <td className={cn(classes.tableDataLarge, classes.tableData)}>
        <Paragraph size='small'>{resource.createdBy}</Paragraph>
      </td>
      <td className={cn(classes.tableDataMedium, classes.tableData, classes.tableDataDate)}>
        <Paragraph size='small'>{resource.lastChanged}</Paragraph>
      </td>
      <td className={cn(classes.tableDataMedium, classes.tableData)}>
        <Tag color={resource.hasPolicy ? 'info' : 'danger'} variant='outlined' size='small'>
          {resource.hasPolicy ? t('resourceadm.dashboard_table_row_has_policy') : t('resourceadm.dashboard_table_row_missing_policy')}
        </Tag>
      </td>
      <td className={cn(classes.tableDataSmall, classes.tableData)}>
        <Button
          variant='quiet'
          size='small'
          color='secondary'
          icon={<PencilWritingIcon />}
          iconPlacement='right'
          onClick={onClickEditResource}
        >
          {t('resourceadm.dashboard_table_row_edit')}
        </Button>
      </td>
    </tr>
  );
};
