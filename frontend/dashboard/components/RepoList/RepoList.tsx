import React, { useMemo, useRef, useState } from 'react';
import type {
  GridActionsColDef,
  GridColDef,
  GridPaginationModel,
  GridRenderCellParams,
  GridRowParams,
  GridSortModel,
  GridValueFormatterParams,
  GridValueGetterParams,
} from '@mui/x-data-grid';
import { DataGrid, GridActionsCellItem, GridOverlay, nbNO } from '@mui/x-data-grid';
import cn from 'classnames';
import type { RepositoryWithStarred } from 'dashboard/utils/repoUtils/repoUtils';
import { MakeCopyModal } from '../MakeCopyModal';
import { getRepoEditUrl } from '../../utils/urlUtils';
import { useTranslation } from 'react-i18next';
import type { DATAGRID_PAGE_SIZE_TYPE } from '../../constants';
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZE_OPTIONS } from '../../constants';
import classes from './RepoList.module.css';
import type { User } from 'app-shared/types/Repository';
import { useSetStarredRepoMutation } from '../../hooks/mutations';
import { useUnsetStarredRepoMutation } from '../../hooks/mutations';
import {
  PencilIcon,
  FilesIcon,
  ExternalLinkIcon,
  StarIcon,
  StarFillIcon,
} from '@navikt/aksel-icons';

export interface IRepoListProps {
  isLoading: boolean;
  repos?: RepositoryWithStarred[];
  isServerSort?: boolean;
  pageSize?: DATAGRID_PAGE_SIZE_TYPE;
  rowCount: number;
  onPageChange?: (page: number) => void;
  onSortModelChange?: (newSortModel: GridSortModel) => void;
  onPageSizeChange?: (newPageSize: DATAGRID_PAGE_SIZE_TYPE) => void;
  pageSizeOptions?: Array<number>;
  sortModel?: GridSortModel;
  disableVirtualization?: boolean;
}

const isRowSelectable = () => false;

const defaultArray: RepositoryWithStarred[] = [];

const gridStyleOverride = {
  border: 'none',
  '.MuiDataGrid-iconSeparator': {
    visibility: 'hidden',
  },
  '.MuiDataGrid-cell--withRenderer:focus-within': {
    outline: 'none',
  },
};

export const NoResults = () => {
  const { t } = useTranslation();
  return (
    <GridOverlay>
      <p>{t('dashboard.no_repos_result')}</p>
    </GridOverlay>
  );
};

const TextWithTooltip = (params: GridRenderCellParams) => {
  return (
    <div className={classes.textWithTooltip} title={params.value}>
      {params.value}
    </div>
  );
};

export const RepoList = ({
  repos = defaultArray,
  isLoading,
  pageSize = DATAGRID_DEFAULT_PAGE_SIZE,
  isServerSort = false,
  rowCount,
  onPageChange,
  onSortModelChange,
  onPageSizeChange,
  pageSizeOptions = DATAGRID_PAGE_SIZE_OPTIONS,
  sortModel,
  disableVirtualization = false,
}: IRepoListProps) => {
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    pageSize,
    page: 0,
  });

  const handlePaginationModelChange = (newPaginationModel: GridPaginationModel) => {
    if (newPaginationModel.page !== paginationModel.page) {
      onPageChange?.(newPaginationModel.page);
    }
    if (newPaginationModel.pageSize !== paginationModel.pageSize) {
      onPageSizeChange?.(newPaginationModel.pageSize as DATAGRID_PAGE_SIZE_TYPE);
    }
    setPaginationModel(newPaginationModel);
  };

  const [copyCurrentRepoName, setCopyCurrentRepoName] = useState('');

  const { mutate: setStarredRepo } = useSetStarredRepoMutation();
  const { mutate: unsetStarredRepo } = useUnsetStarredRepoMutation();
  const copyModalAnchorRef = useRef(null);
  const { t } = useTranslation();

  const cols = useMemo(() => {
    const favouriteActionCol: GridActionsColDef = {
      field: '',
      renderHeader: (): null => null,
      hideSortIcons: true,
      type: 'actions',
      headerClassName: classes.columnHeader,
      width: 50,
      getActions: (params: GridRowParams) => {
        const repo = params.row as RepositoryWithStarred;

        const handleToggleFav = () => {
          if (repo.hasStarred) {
            unsetStarredRepo(repo);
          } else {
            setStarredRepo(repo);
          }
        };

        return [
          <GridActionsCellItem
            key={repo.id}
            id={`fav-repo-${repo.id}`}
            onClick={handleToggleFav}
            label={t(repo.hasStarred ? 'dashboard.unstar' : 'dashboard.star', {
              appName: repo.name,
            })}
            icon={
              repo.hasStarred ? (
                <StarFillIcon name='star-fill-icon' className={classes.favoriteIcon} />
              ) : (
                <StarIcon name='star-icon' className={classes.dropdownIcon} />
              )
            }
          />,
        ];
      },
    };

    const columns: GridColDef[] = [
      {
        field: 'name',
        headerName: t('dashboard.name'),
        width: 200,
        renderCell: TextWithTooltip,
      },
      {
        field: 'owner.created_by',
        headerName: t('dashboard.created_by'),
        width: 180,
        renderCell: TextWithTooltip,
        valueGetter: (params: GridValueGetterParams) => {
          const owner = params.row.owner as User;
          return owner.full_name || owner.login;
        },
      },
      {
        field: 'updated_at',
        headerName: t('dashboard.last_modified'),
        width: 120,
        type: 'date',
        valueFormatter: (params: GridValueFormatterParams) => {
          const date = params.value as string;
          return new Date(date).toLocaleDateString('nb', { dateStyle: 'short' });
        },
      },
      {
        field: 'description',
        headerName: t('dashboard.description'),
        flex: 1,
        minWidth: 120,
        renderCell: TextWithTooltip,
      },
    ];
    const actionsCol: GridActionsColDef[] = [
      {
        field: 'links',
        width: 400,
        renderHeader: (): null => null,
        type: 'actions',
        align: 'right',
        getActions: (params: GridRowParams) => {
          const repoFullName = params.row.full_name as string;
          const [org, repo] = repoFullName.split('/');
          const isDatamodelling = repoFullName.endsWith('-datamodels');
          const editUrl = getRepoEditUrl({ org, repo });
          const editTextKey = isDatamodelling ? 'dashboard.edit_datamodels' : 'dashboard.edit_app';

          return [
            <GridActionsCellItem
              className={cn(classes.actionLink, classes.repoLink)}
              icon={<i className={cn('fa fa-gitea', classes.linkIcon, classes.repoLink)} />}
              key={`dashboard.repository${params.row.id}`}
              label={t('dashboard.repository_in_list', { appName: repo })}
              onClick={() => (window.location.href = params.row.html_url)}
              showInMenu={false}
              edge='end'
            />,
            <GridActionsCellItem
              className={cn(classes.actionLink, classes.editLink)}
              icon={
                <PencilIcon
                  title={t('dashboard.edit_app_icon')}
                  className={cn(classes.linkIcon, classes.editLink)}
                />
              }
              key={`dashboard.edit_app${params.row.id}`}
              label={t('dashboard.edit_app', { appName: repo })}
              onClick={() => (window.location.href = editUrl)}
              showInMenu={false}
            >
              <a
                key={params.row.id}
                href={params.row.html_url}
                className={cn(classes.actionLink, classes.repoLink)}
              >
                <span>{t(editTextKey)}</span>
                <PencilIcon className={classes.linkIcon} />
              </a>
              ,
            </GridActionsCellItem>,
            <GridActionsCellItem
              icon={<FilesIcon className={classes.dropdownIcon} />}
              key={`dashboard.make_copy${params.row.id}`}
              label={t('dashboard.make_copy')}
              onClick={() => setCopyCurrentRepoName(repoFullName)}
              showInMenu
            />,
            <GridActionsCellItem
              icon={<ExternalLinkIcon className={classes.dropdownIcon} />}
              key={`dashboard.open_in_new${params.row.id}`}
              label={t('dashboard.open_in_new')}
              onClick={() => window.open(editUrl, '_blank')}
              showInMenu
            />,
          ];
        },
      },
    ];

    return [favouriteActionCol, ...columns, ...actionsCol];
  }, [setStarredRepo, t, unsetStarredRepo]);

  const handleCloseCopyModal = () => setCopyCurrentRepoName(null);

  const localText = {
    ...nbNO.components.MuiDataGrid.defaultProps.localeText,
    noRowsLabel: t('dashboard.no_repos_result'),
  };

  return (
    <div ref={copyModalAnchorRef}>
      {isServerSort ? (
        <DataGrid
          localeText={localText}
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationModelChange}
          autoHeight={true}
          loading={isLoading}
          rows={repos}
          columns={cols}
          disableColumnMenu={true}
          isRowSelectable={isRowSelectable}
          sortModel={sortModel}
          paginationMode='server'
          sortingMode='server'
          onSortModelChange={onSortModelChange}
          rowCount={rowCount ?? 0}
          pageSizeOptions={pageSizeOptions}
          sx={gridStyleOverride}
          disableVirtualization={disableVirtualization}
        />
      ) : (
        <DataGrid
          localeText={localText}
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationModelChange}
          autoHeight={true}
          loading={isLoading}
          rows={repos}
          columns={cols}
          pageSizeOptions={pageSizeOptions}
          disableColumnMenu={true}
          isRowSelectable={isRowSelectable}
          sx={gridStyleOverride}
          disableVirtualization={disableVirtualization}
        />
      )}
      {copyCurrentRepoName && (
        <MakeCopyModal
          anchorEl={copyModalAnchorRef.current}
          handleClose={handleCloseCopyModal}
          serviceFullName={copyCurrentRepoName}
        />
      )}
    </div>
  );
};
