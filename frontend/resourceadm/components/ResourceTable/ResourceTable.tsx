import React, { useMemo } from 'react';
import classes from './ResourceTable.module.css';
import { PencilIcon, DownloadIcon } from '@studio/icons';
import { Tag } from '@digdir/design-system-react';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { useTranslation } from 'react-i18next';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { DataGrid, GridActionsCellItem, GridOverlay } from '@mui/x-data-grid';

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

  onClickImportResource?: (id: string, availableEnvs: string[]) => void;
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
}: ResourceTableProps): React.JSX.Element => {
  const { t, i18n } = useTranslation();

  const listData = useMemo(() => {
    return list.map((listItem) => {
      return {
        ...listItem,
        title:
          listItem.title[i18n?.language] ||
          listItem.title.nb ||
          t('resourceadm.dashboard_table_row_missing_title'),
      };
    });
  }, [list, i18n?.language, t]);

  const NoResults = () => {
    return (
      <GridOverlay>
        <p>{t('resourceadm.dashboard_no_resources_result')}</p>
      </GridOverlay>
    );
  };

  const gridStyleOverride = {
    border: 'none',
    width: '100%',
    '.MuiDataGrid-iconSeparator': {
      visibility: 'hidden',
    },
  };

  const columns: GridColDef[] = [
    {
      field: 'title',
      headerName: t('resourceadm.dashboard_table_header_name'),
      width: 200,
    },
    {
      field: 'identifier',
      headerName: t('resourceadm.dashboard_table_header_resourceid'),
      width: 200,
    },
    {
      field: 'createdBy',
      headerName: t('resourceadm.dashboard_table_header_createdby'),
      width: 180,
    },
    {
      field: 'lastChanged',
      headerName: t('resourceadm.dashboard_table_header_last_changed'),
      width: 120,
      type: 'date',
      valueFormatter: ({ value }) =>
        value
          ? new Date(value).toLocaleDateString('nb-NO', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })
          : '',
    },
    {
      field: 'environments',
      sortable: false,
      headerName: t('resourceadm.dashboard_table_header_environment'),
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        return (
          <div className={classes.tagContainer}>
            {params.row.environments.map((env: string) => {
              return (
                <Tag key={env} color={'info'} size='small'>
                  {env == 'gitea'
                    ? t('resourceadm.dashboard_table_row_in_gitea')
                    : env.toUpperCase()}
                </Tag>
              );
            })}
          </div>
        );
      },
    },
    {
      field: 'links',
      headerName: '',
      sortable: false,
      width: 50,
      renderCell: (params) => {
        const existsInGitea = params.row.environments.some((env: string) => env === 'gitea');
        if (existsInGitea) {
          return [
            <GridActionsCellItem
              icon={
                <PencilIcon
                  title={t('resourceadm.dashboard_table_row_edit')}
                  className={classes.editLink}
                />
              }
              label={t('resourceadm.dashboard_table_row_edit')}
              key={`dashboard.edit_resource${params.row.identifier}`}
              onClick={() => onClickEditResource(params.row.identifier)}
              showInMenu={false}
            />,
          ];
        } else if (!!onClickImportResource) {
          return (
            <GridActionsCellItem
              icon={
                <DownloadIcon
                  title={t('resourceadm.dashboard_table_row_import')}
                  className={classes.editLink}
                />
              }
              label={t('resourceadm.dashboard_table_row_import')}
              key={`dashboard.import_resource${params.row.identifier}`}
              onClick={() => onClickImportResource(params.row.identifier, params.row.environments)}
              showInMenu={false}
            />
          );
        } else {
          return [];
        }
      },
    },
  ];

  return (
    <DataGrid
      autoHeight
      rows={listData}
      getRowId={(row) => row.identifier}
      disableRowSelectionOnClick
      disableColumnMenu
      sx={gridStyleOverride}
      hideFooterPagination
      disableVirtualization
      columns={columns}
      components={{
        NoRowsOverlay: NoResults,
      }}
    />
  );
};
