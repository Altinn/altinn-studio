import * as React from 'react';
import {
  DataGrid,
  GridSortModel,
  GridActionsColDef,
  GridRowParams,
  GridActionsCellItem,
  GridValueGetterParams,
  GridValueFormatterParams,
  GridColDef,
  GridOverlay,
} from '@mui/x-data-grid';
import { makeStyles } from '@material-ui/core';
import { IconButton } from '@mui/material';
import cn from 'classnames';

import { getLanguageFromKey } from 'app-shared/utils/language';
import { IRepository } from 'app-shared/types';

import { User } from '../../resources/fetchDashboardResources/dashboardSlice';
import { MakeCopyModal } from 'common/components/MakeCopyModal';
import { useAppSelector } from 'common/hooks';
import {
  useSetStarredRepoMutation,
  useUnsetStarredRepoMutation,
} from 'services/userApi';

import { getRepoEditUrl } from 'common/utils/repoListUtils';

type RepoListProps = {
  isLoading: boolean;
  repos?: IRepository[];
  isServerSort?: boolean;
  pageSize?: number;
  rowCount?: number;
  onPageChange?: (page: number) => void;
  onSortModelChange?: (newSortModel: GridSortModel) => void;
  sortModel?: GridSortModel;
};

const defaultPageSize = 8;

const isRowSelectable = () => false;

const defaultArray: IRepository[] = [];

const useStyles = makeStyles({
  repoLink: {
    color: '#579b2e',

    '&:hover': {
      color: '#579b2e',
    },
  },
  editLink: {
    color: '#165db8',

    '&:hover': {
      color: '#165db8',
    },
  },
  actionLink: {
    marginRight: '1rem',
    display: 'flex',
    alignItems: 'center',

    '&:hover': {
      'text-decoration': 'none',
    },

    '&:hover span': {
      'text-decoration': 'underline',
    },
  },
  linkIcon: {
    fontSize: '2rem',
    marginLeft: '0.5rem',
  },
  dropdownIcon: {
    fontSize: '2rem',
  },
  favoriteIcon: {
    fontSize: 26,
    color: '#000000',
  },
});

const gridStyleOverride = {
  border: 'none',
  '.MuiDataGrid-iconSeparator': {
    visibility: 'hidden',
  },
  '.MuiDataGrid-cell--withRenderer:focus-within': {
    outline: 'none',
  },
};

export const NoResults = (language: any) => {
  return (
    <GridOverlay>
      <p>
        {getLanguageFromKey('dashboard.no_repos_result', language)}
      </p>
    </GridOverlay>
  );
}

export const RepoList = ({
  repos = defaultArray,
  isLoading,
  pageSize = defaultPageSize,
  isServerSort = false,
  rowCount,
  onPageChange,
  onSortModelChange,
  sortModel,
}: RepoListProps) => {
  const classes = useStyles();
  const language = useAppSelector((state) => state.language.language);
  const [copyCurrentRepoName, setCopyCurrentRepoName] = React.useState('');
  const [setStarredRepo] = useSetStarredRepoMutation();
  const [unsetStarredRepo] = useUnsetStarredRepoMutation();
  const copyModalAnchorRef = React.useRef(null);

  const cols = React.useMemo(() => {
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
          <IconButton key={params.row.id} onClick={handleToggleFav}>
            <i
              className={cn(classes.favoriteIcon, {
                'fa fa-fav-filled': repo.user_has_starred,
                'fa fa-fav-outline': !repo.user_has_starred,
              })}
            />
          </IconButton>,
        ];
      },
    };

    const columns: GridColDef[] = [
      {
        field: 'name',
        headerName: getLanguageFromKey('dashboard.application', language),
        width: 150,
      },
      {
        field: 'owner.created_by',
        headerName: getLanguageFromKey('dashboard.created_by', language),
        sortable: false,
        width: 160,
        valueGetter: (params: GridValueGetterParams) => {
          const owner = params.row.owner as User;
          return owner.full_name || owner.login;
        },
      },
      {
        field: 'updated_at',
        headerName: getLanguageFromKey('dashboard.last_modified', language),
        width: 150,
        editable: true,
        type: 'date',
        valueFormatter: (params: GridValueFormatterParams) => {
          const date = params.value as string;
          return new Date(date).toLocaleDateString();
        },
      },
    ];

    const actionsCol: GridActionsColDef[] = [
      {
        field: 'links',
        flex: 1,
        renderHeader: (): null => null,
        type: 'actions',
        align: 'right',
        getActions: (params: GridRowParams) => {
          const editUrl = getRepoEditUrl({
            repoFullName: params.row.full_name as string,
          });

          const handleDuplicateClick = () => {
            setCopyCurrentRepoName(params.row.full_name);
          };

          const handleOpenInNewClick = () => {
            window.open(editUrl, '_blank');
          };

          return [
            <a
              key={params.row.id}
              href={params.row.html_url}
              className={cn(classes.actionLink, classes.repoLink)}
            >
              <span>
                {getLanguageFromKey('dashboard.repository', language)}
              </span>
              <i className={cn('fa fa-gitea', classes.linkIcon)} />
            </a>,
            <a
              key={params.row.id}
              href={editUrl}
              className={cn(classes.actionLink, classes.editLink)}
            >
              <span>{getLanguageFromKey('dashboard.edit_app', language)}</span>
              <i className={cn('fa fa-edit', classes.linkIcon)} />
            </a>,
            <GridActionsCellItem
              icon={<i className={cn('fa fa-copy', classes.dropdownIcon)} />}
              key={params.row.id}
              onClick={handleDuplicateClick}
              showInMenu={true}
              label={getLanguageFromKey('dashboard.make_copy', language)}
            />,
            <GridActionsCellItem
              icon={<i className={cn('fa fa-newtab', classes.dropdownIcon)} />}
              key={params.row.id}
              onClick={handleOpenInNewClick}
              showInMenu={true}
              label={getLanguageFromKey('dashboard.open_in_new', language)}
            />,
          ];
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

  const rowsPerPage = React.useMemo(() => {
    return [pageSize];
  }, [pageSize]);

  const handleCloseCopyModal = () => {
    setCopyCurrentRepoName(null);
  };

  return (
    <div ref={copyModalAnchorRef}>
      {isServerSort ? (
        <DataGrid
          components={{
            NoRowsOverlay: NoResults(language),
          }}
          autoHeight={true}
          loading={isLoading}
          rows={repos}
          columns={cols}
          pageSize={pageSize}
          rowsPerPageOptions={rowsPerPage}
          disableColumnMenu={true}
          isRowSelectable={isRowSelectable}
          sortModel={sortModel}
          paginationMode='server'
          sortingMode='server'
          onSortModelChange={onSortModelChange}
          rowCount={rowCount}
          onPageChange={onPageChange}
          sx={gridStyleOverride}
        />
      ) : (
        <DataGrid
          components={{
            NoRowsOverlay: NoResults(language),
          }}
          autoHeight={true}
          loading={isLoading}
          rows={repos}
          columns={cols}
          pageSize={pageSize}
          rowsPerPageOptions={rowsPerPage}
          disableColumnMenu={true}
          isRowSelectable={isRowSelectable}
          sx={gridStyleOverride}
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
