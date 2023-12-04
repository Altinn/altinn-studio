import React, { useMemo } from 'react';
import cn from 'classnames';
import classes from './ResourceTable.module.css';
import { PencilIcon } from '@navikt/aksel-icons';
import { Tag } from '@digdir/design-system-react';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { useTranslation } from 'react-i18next';
import {
  DataGrid,
  GridActionsCellItem,
  GridOverlay,
  GridRenderCellParams,
  GridRowParams,
} from '@mui/x-data-grid';

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
  onToggleFavourite?: (id: string) => void;
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
export const ResourceTable = ({
  list,
  onClickEditResource,
}: ResourceTableProps): React.ReactNode => {
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

  const columns = [
    {
      field: 'title',
      headerName: t('resourceadm.dashboard_table_header_name'),
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
    },
    {
      field: 'hasPolicy',
      headerName: t('resourceadm.dashboard_table_header_policy_rules'),
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        return (
          <Tag color={params.row.hasPolicy ? 'info' : 'danger'} variant='secondary' size='small'>
            {params.row.hasPolicy
              ? t('resourceadm.dashboard_table_row_has_policy')
              : t('resourceadm.dashboard_table_row_missing_policy')}
          </Tag>
        );
      },
    },
    {
      field: 'links',
      width: 50,
      renderHeader: (): null => null,
      type: 'actions',
      getActions: (params: GridRowParams) => {
        return [
          <GridActionsCellItem
            icon={
              <PencilIcon
                title={t('resourceadm.dashboard_table_row_edit')}
                className={cn(classes.editLink)}
              />
            }
            label={t('resourceadm.dashboard_table_row_edit')}
            key={`dashboard.edit_resource${params.row.identifier}`}
            onClick={() => onClickEditResource(params.row.identifier)}
            showInMenu={false}
          />,
        ];
      },
    },
  ];

  return (
    <DataGrid
      autoHeight
      rows={listData}
      getRowId={(row) => row.identifier}
      disableSelectionOnClick
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
