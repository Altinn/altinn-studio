import React, { type ReactNode } from 'react';
import classes from './ResourceTable.module.css';
import { Tag } from '@digdir/designsystemet-react';
import { StudioTableLocalPagination } from '@studio/components';
import type { Columns } from '@studio/components';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { useTranslation } from 'react-i18next';
import { ResourceTableActions } from './ResourceTableActions';

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
  /**
   * Function to be executed when clicking the import resource button
   * @param id the id of the resource
   * @param availableEnvs all environments the resource with given id exists in
   * @returns void
   */
  onClickImportResource?: (id: string, availableEnvs: string[]) => void;
  /**
   * Function to be executed when clicking the delete resource button
   * @param id the id of the resource
   * @returns void
   */
  onClickDeleteResource?: (id: string) => void;
  /**
   * Id of the resource being imported. Only one resource can be imported at the same time
   */
  importResourceId?: string;
};

/**
 * @component
 *    Table to display a list of all resources available
 *
 * @property {ResourceListItem[]}[list] - The list to display in the table
 * @property {function}[onClickEditResource] - Function to be executed when clicking the edit resoruce
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceTable = ({
  list,
  onClickEditResource,
  onClickImportResource,
  onClickDeleteResource,
  importResourceId,
}: ResourceTableProps): React.JSX.Element => {
  const { t, i18n } = useTranslation();

  const getListItemTitle = (listItem: ResourceListItem): string => {
    return (
      listItem.title[i18n?.language] ||
      listItem.title.nb ||
      t('dashboard.resource_table_row_missing_title')
    );
  };

  const listData = list.map((listItem) => {
    return {
      ...listItem,
      id: listItem.identifier,
      lastChanged: (listItem.lastChanged ?? '').toString(),
      title: getListItemTitle(listItem),
      environments: <ResourceEnvironments listItem={listItem} />,
      links: (
        <ResourceTableActions
          listItem={listItem}
          resourceName={getListItemTitle(listItem)}
          onEditResource={onClickEditResource}
          onDeleteResource={onClickDeleteResource}
          onImportResource={onClickImportResource}
          importResourceId={importResourceId}
        />
      ),
    };
  });

  const columns: Columns = [
    {
      accessor: 'title',
      heading: t('dashboard.resource_table_header_name'),
      sortable: true,
    },
    {
      accessor: 'identifier',
      heading: t('dashboard.resource_table_header_resourceid'),
      sortable: true,
    },
    {
      accessor: 'createdBy',
      heading: t('dashboard.resource_table_header_createdby'),
      sortable: true,
    },
    {
      accessor: 'lastChanged',
      heading: t('dashboard.resource_table_header_last_changed'),
      sortable: true,
      bodyCellFormatter: (value: string) =>
        value
          ? new Date(value).toLocaleDateString('no-NB', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })
          : '',
    },
    {
      accessor: 'environments',
      heading: t('dashboard.resource_table_header_environment'),
    },
    {
      accessor: 'links',
      heading: '',
    },
  ];

  return (
    <StudioTableLocalPagination
      columns={columns}
      rows={listData}
      size='small'
      emptyTableFallback={t('dashboard.resource_table_no_resources_result')}
    />
  );
};

interface ResourceEnvironmentsProps {
  listItem: ResourceListItem;
}
const ResourceEnvironments = ({ listItem }: ResourceEnvironmentsProps): ReactNode => {
  const { t } = useTranslation();

  return (
    <div className={classes.tagContainer}>
      {listItem.environments.map((env: string) => {
        let tagText = env.toUpperCase();
        if (env === 'prod') {
          tagText = t('dashboard.resource_table_row_in_prod');
        } else if (env === 'gitea') {
          tagText = t('dashboard.resource_table_row_in_gitea');
        }
        return (
          <Tag key={env} color='info' size='small'>
            {tagText}
          </Tag>
        );
      })}
    </div>
  );
};
