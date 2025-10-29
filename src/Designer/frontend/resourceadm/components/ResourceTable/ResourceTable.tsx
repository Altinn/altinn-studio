import React from 'react';
import classes from './ResourceTable.module.css';
import { PencilIcon, FileImportIcon, FilterIcon } from '@studio/icons';
import {
  StudioButton,
  StudioSpinner,
  StudioTag,
  StudioTableLocalPagination,
  StudioDropdown,
  StudioCheckbox,
  useStudioCheckboxGroup,
} from '@studio/components';

import type { Columns } from '@studio/components-legacy';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { useTranslation } from 'react-i18next';
import { LOCAL_RESOURCE_CHANGED_TIME } from '../../utils/resourceListUtils';
import { getAvailableEnvironments, resourceTypeMap } from '../../utils/resourceUtils';

const isDateEqualToLocalResourceChangedTime = (date: Date): boolean => {
  return (
    date.getFullYear() === LOCAL_RESOURCE_CHANGED_TIME.getFullYear() &&
    date.getMonth() === LOCAL_RESOURCE_CHANGED_TIME.getMonth() &&
    date.getDate() === LOCAL_RESOURCE_CHANGED_TIME.getDate()
  );
};

const isDateEqualToMinDate = (date: Date): boolean => {
  return new Date(date).getTime() === 0;
};

export type ResourceTableProps = {
  /**
   * Org code
   */
  org: string;
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
   * @param id all environments the resource with given id exists in
   * @returns void
   */
  onClickImportResource?: (id: string, availableEnvs: string[]) => void;
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
  org,
  list,
  onClickEditResource,
  onClickImportResource,
  importResourceId,
}: ResourceTableProps): React.JSX.Element => {
  const { t, i18n } = useTranslation();

  const orgEnvs = [
    { id: 'gitea', label: 'dashboard.resource_table_row_in_gitea' },
    ...getAvailableEnvironments(org),
  ];
  const {
    getCheckboxProps,
    value: selectedEnvs,
    setValue: setSelectedEnvs,
  } = useStudioCheckboxGroup();

  const renderLinkCell = (listItem: ResourceListItem): React.ReactElement => {
    const existsInGitea = listItem.environments.some((env: string) => env === 'gitea');
    if (existsInGitea) {
      return (
        <StudioButton
          variant='tertiary'
          icon={
            <PencilIcon
              title={t('dashboard.resource_table_row_edit', {
                resourceName: getListItemTitle(listItem),
              })}
              className={classes.editLink}
            />
          }
          onClick={() => onClickEditResource(listItem.identifier)}
          data-size='md'
        />
      );
    } else if (!!onClickImportResource && importResourceId === listItem.identifier) {
      return <StudioSpinner aria-label={t('dashboard.resource_table_row_importing')} />;
    } else if (!!onClickImportResource) {
      return (
        <StudioButton
          variant='tertiary'
          icon={
            <FileImportIcon
              title={t('dashboard.resource_table_row_import', {
                resourceName: getListItemTitle(listItem),
              })}
              className={classes.editLink}
            />
          }
          onClick={() => onClickImportResource(listItem.identifier, listItem.environments)}
          data-size='md'
        />
      );
    } else {
      return null;
    }
  };

  const getListItemTitle = (listItem): string => {
    return (
      listItem.title[i18n?.language] ||
      listItem.title.nb ||
      t('dashboard.resource_table_row_missing_title')
    );
  };

  const listData = list
    .filter((listItem) => selectedEnvs.every((env) => listItem.environments.includes(env)))
    .map((listItem) => {
      return {
        ...listItem,
        id: listItem.identifier,
        lastChanged: (listItem.lastChanged ?? '').toString(),
        title: getListItemTitle(listItem),

        environments: (
          <div className={classes.tagContainer}>
            {listItem.environments.map((env: string) => {
              let tagText = env.toUpperCase();
              if (env === 'prod') {
                tagText = t('dashboard.resource_table_row_in_prod');
              } else if (env === 'gitea') {
                tagText = t('dashboard.resource_table_row_in_gitea');
              }
              return (
                <StudioTag key={env} data-color='info'>
                  {tagText}
                </StudioTag>
              );
            })}
          </div>
        ),
        links: <div className={classes.editLinkCell}>{renderLinkCell(listItem)}</div>,
      };
    });

  const columns: Columns = [
    {
      accessor: 'title',
      heading: t('dashboard.resource_table_header_name'),
      headerCellClass: classes.headerCell,
      sortable: true,
    },
    {
      accessor: 'identifier',
      heading: t('dashboard.resource_table_header_resourceid'),
      headerCellClass: classes.headerCell,
      sortable: true,
    },
    {
      accessor: 'resourceType',
      heading: 'Ressurstype',
      headerCellClass: classes.headerCell,
      sortable: true,
      bodyCellFormatter: (value: string) => {
        return t(resourceTypeMap[value]);
      },
    },
    {
      accessor: 'createdBy',
      heading: t('dashboard.resource_table_header_createdby'),
      headerCellClass: classes.headerCell,
      sortable: true,
    },
    {
      accessor: 'lastChanged',
      heading: t('dashboard.resource_table_header_last_changed'),
      headerCellClass: classes.headerCell,
      sortable: true,
      bodyCellFormatter: (value: string) => {
        if (!value) {
          return '';
        }
        const date = new Date(value);
        if (isDateEqualToLocalResourceChangedTime(date) || isDateEqualToMinDate(date)) {
          return '';
        }
        return date.toLocaleDateString('no-NB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      },
    },
    {
      accessor: 'environments',
      heading: (
        <div className={classes.envHeaderCell}>
          {t('dashboard.resource_table_header_environment')}
          <StudioDropdown
            icon={<FilterIcon title={t('dashboard.resource_table_env_filter_button_aria_label')} />}
            triggerButtonText={selectedEnvs.length > 0 ? `(${selectedEnvs.length})` : ''}
            triggerButtonVariant='tertiary'
          >
            <StudioDropdown.List>
              <StudioDropdown.Item>
                <StudioCheckbox
                  checked={selectedEnvs.length === 0}
                  label={t('dashboard.resource_table_env_filter_all')}
                  onChange={() => setSelectedEnvs([])}
                />
              </StudioDropdown.Item>
              {orgEnvs.map((env) => {
                return (
                  <StudioDropdown.Item key={env.id}>
                    <StudioCheckbox {...getCheckboxProps(env.id)} label={t(env.label)} />
                  </StudioDropdown.Item>
                );
              })}
            </StudioDropdown.List>
          </StudioDropdown>
        </div>
      ),
      headerCellClass: classes.headerCell,
    },
    {
      accessor: 'links',
      heading: '',
      headerCellClass: classes.headerCell,
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
