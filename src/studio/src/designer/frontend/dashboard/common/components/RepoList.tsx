import React, { useMemo, useRef, useState } from 'react';
import {
  DataGrid,
  GridActionsCellItem,
  GridActionsColDef,
  GridColDef,
  GridOverlay,
  GridRenderCellParams,
  GridRowParams,
  GridSortModel,
  GridValueFormatterParams,
  GridValueGetterParams,
} from '@mui/x-data-grid';
import cn from 'classnames';
import { getLanguageFromKey } from 'app-shared/utils/language';
import type { IRepository } from 'app-shared/types/global';
import { User } from '../../resources/fetchDashboardResources/dashboardSlice';
import { MakeCopyModal } from './MakeCopyModal';
import { getRepoEditUrl } from '../utils/urlUtils';
import {
  useSetStarredRepoMutation,
  useUnsetStarredRepoMutation,
} from '../../services/userApi';
import { useAppSelector } from '../hooks';
import classes from './RepoList.module.css';

export interface IRepoListProps {
  isLoading: boolean;
  repos?: IRepository[];
  isServerSort?: boolean;
  pageSize?: number;
  rowCount: number;
  onPageChange?: (page: number) => void;
  onSortModelChange?: (newSortModel: GridSortModel) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  rowsPerPageOptions?: Array<number>;
  sortModel?: GridSortModel;
  disableVirtualization?: boolean;
}

const defaultPageSize = 5;
const defaultRowsPerPageOptions = [5];

const isRowSelectable = () => false;

const defaultArray: IRepository[] = [];

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
  const language = useAppSelector((state) => state.language.language);
  return (
    <GridOverlay>
      <p>{getLanguageFromKey('dashboard.no_repos_result', language)}</p>
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
  pageSize = defaultPageSize,
  isServerSort = false,
  rowCount,
  onPageChange,
  onSortModelChange,
  onPageSizeChange,
  rowsPerPageOptions = defaultRowsPerPageOptions,
  sortModel,
  disableVirtualization = false,
}: IRepoListProps) => {
  const language = useAppSelector((state) => state.language.language);
  const [copyCurrentRepoName, setCopyCurrentRepoName] = useState('');
  const [setStarredRepo] = useSetStarredRepoMutation();
  const [unsetStarredRepo] = useUnsetStarredRepoMutation();
  const copyModalAnchorRef = useRef(null);
  const t = (key: string) => getLanguageFromKey(key, language);
  const cols = useMemo(() => {
    const favouriteActionCol: GridActionsColDef = {
      field: '',
      renderHeader: (): null => null,
      hideSortIcons: true,
      type: 'actions',
      width: 50,
      getActions: (params: GridRowParams) => {
        const repo = params.row as IRepository;
        const handleToggleFav = () => {
          if (repo.user_has_starred) {
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
            label={
              repo.user_has_starred
                ? t('dashboard.unstar')
                : t('dashboard.star')
            }
            icon={
              <i
                className={cn(classes.favoriteIcon, {
                  'fa fa-fav-filled': repo.user_has_starred,
                  'fa fa-fav-outline': !repo.user_has_starred,
                })}
              />
            }
          />,
        ];
      },
    };

    const columns: GridColDef[] = [
      {
        field: 'name',
        headerName: t('dashboard.application'),
        width: 200,
        renderCell: TextWithTooltip,
      },
      {
        field: 'owner.created_by',
        headerName: t('dashboard.created_by'),
        sortable: false,
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
          return new Date(date).toLocaleDateString('nb');
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
        width: 320,
        renderHeader: (): null => null,
        type: 'actions',
        align: 'right',
        getActions: (params: GridRowParams) => {
          const repoFullName = params.row.full_name as string;
          const isDatamodelling = repoFullName.endsWith('-datamodels');
          const editUrl = getRepoEditUrl({ repoFullName });
          const colItems = [
            <GridActionsCellItem
              className={cn(classes.actionLink, classes.repoLink)}
              data-testid='gitea-repo-link'
              icon={
                <i
                  className={cn(
                    'fa fa-gitea',
                    classes.linkIcon,
                    classes.repoLink
                  )}
                />
              }
              key={'dashboard.repository' + params.row.id}
              label={t('dashboard.repository')}
              onClick={() => (window.location.href = params.row.html_url)}
              showInMenu={false}
              edge='end'
            />,
            <GridActionsCellItem
              data-testid='edit-repo-link'
              className={cn(classes.actionLink, classes.editLink)}
              icon={
                <i
                  className={cn(
                    'fa fa-edit',
                    classes.linkIcon,
                    classes.editLink
                  )}
                />
              }
              key={'dashboard.edit_app' + params.row.id}
              label={t('dashboard.edit_app')}
              onClick={() => (window.location.href = editUrl)}
              showInMenu={false}
            />,
            <GridActionsCellItem
              icon={<i className={cn('fa fa-copy', classes.dropdownIcon)} />}
              key={'dashboard.make_copy' + params.row.id}
              label={t('dashboard.make_copy')}
              onClick={() => setCopyCurrentRepoName(repoFullName)}
              showInMenu
            />,
            <GridActionsCellItem
              icon={<i className={cn('fa fa-newtab', classes.dropdownIcon)} />}
              key={'dashboard.open_in_new' + params.row.id}
              label={t('dashboard.open_in_new')}
              onClick={() => window.open(editUrl, '_blank')}
              showInMenu
            />,
          ];

          if (isDatamodelling) {
            // TODO: remove this weird logic once standalone datamodelling is OK
            // hides context menu and edit app as neither is applicable just yet
            return colItems.splice(0, 1);
          }

          return colItems;
        },
      },
    ];

    return [favouriteActionCol, ...columns, ...actionsCol];
  }, [
    classes.actionLink,
    classes.editLink,
    classes.repoLink,
    classes.dropdownIcon,
    classes.linkIcon,
    classes.favoriteIcon,
    language,
    setStarredRepo,
    unsetStarredRepo,
  ]);

  const handleCloseCopyModal = () => setCopyCurrentRepoName(null);

  const componentPropsLabelOverrides = useMemo(
    () => ({
      pagination: {
        labelRowsPerPage: t('dashboard.rows_per_page'),
      },
    }),
    [language]
  );

  return (
    <div ref={copyModalAnchorRef}>
      {isServerSort ? (
        <DataGrid
          components={{
            NoRowsOverlay: NoResults,
          }}
          componentsProps={componentPropsLabelOverrides}
          autoHeight={true}
          loading={isLoading}
          rows={repos}
          columns={cols}
          pageSize={pageSize}
          disableColumnMenu={true}
          isRowSelectable={isRowSelectable}
          sortModel={sortModel}
          paginationMode='server'
          sortingMode='server'
          onSortModelChange={onSortModelChange}
          onPageSizeChange={onPageSizeChange}
          rowCount={rowCount ?? 0}
          rowsPerPageOptions={rowsPerPageOptions}
          onPageChange={onPageChange}
          sx={gridStyleOverride}
          disableVirtualization={disableVirtualization}
        />
      ) : (
        <DataGrid
          componentsProps={componentPropsLabelOverrides}
          components={{
            NoRowsOverlay: NoResults,
          }}
          autoHeight={true}
          loading={isLoading}
          rows={repos}
          columns={cols}
          pageSize={pageSize}
          rowsPerPageOptions={rowsPerPageOptions}
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
