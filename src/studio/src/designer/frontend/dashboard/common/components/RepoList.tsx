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
import { makeStyles } from '@mui/styles';
import { IconButton } from '@mui/material';
import cn from 'classnames';
import { getLanguageFromKey } from 'app-shared/utils/language';
import type { IRepository } from 'app-shared/types/global';
import { User } from '../../resources/fetchDashboardResources/dashboardSlice';
import { MakeCopyModal } from 'common/components/MakeCopyModal';
import { useAppSelector } from 'common/hooks';
import { useSetStarredRepoMutation, useUnsetStarredRepoMutation } from 'services/userApi';

import { getRepoEditUrl } from 'common/utils/urlUtils';

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

const useStyles = makeStyles({
  repoLink: {
    color: '#57823D',
    '&:hover': {
      color: '#57823D',
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
  textWithTooltip: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
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

export const NoResults = () => {
  const language = useAppSelector((state) => state.language.language);

  return (
    <GridOverlay>
      <p>{getLanguageFromKey('dashboard.no_repos_result', language)}</p>
    </GridOverlay>
  );
};

const TextWithTooltip = (params: GridRenderCellParams) => {
  const classes = useStyles();

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
  const classes = useStyles();
  const language = useAppSelector((state) => state.language.language);
  const [copyCurrentRepoName, setCopyCurrentRepoName] = useState('');
  const [setStarredRepo] = useSetStarredRepoMutation();
  const [unsetStarredRepo] = useUnsetStarredRepoMutation();
  const copyModalAnchorRef = useRef(null);

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
          <IconButton
            key={repo.id}
            id={`fav-repo-${repo.id}`}
            onClick={handleToggleFav}
            aria-label={
              repo.user_has_starred
                ? getLanguageFromKey('dashboard.unstar', language)
                : getLanguageFromKey('dashboard.star', language)
            }
          >
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
        width: 200,
        renderCell: TextWithTooltip,
      },
      {
        field: 'owner.created_by',
        headerName: getLanguageFromKey('dashboard.created_by', language),
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
        headerName: getLanguageFromKey('dashboard.last_modified', language),
        width: 120,
        type: 'date',
        valueFormatter: (params: GridValueFormatterParams) => {
          const date = params.value as string;
          return new Date(date).toLocaleDateString('nb');
        },
      },
      {
        field: 'description',
        headerName: getLanguageFromKey('dashboard.description', language),
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
              icon={<i className={cn('fa fa-gitea', classes.linkIcon, classes.repoLink)} />}
              key={'dashboard.repository' + params.row.id}
              label={getLanguageFromKey('dashboard.repository', language)}
              onClick={() => (window.location.href = params.row.html_url)}
              showInMenu={false}
              edge='end'
            />,
            <GridActionsCellItem
              data-testid='edit-repo-link'
              className={cn(classes.actionLink, classes.editLink)}
              icon={<i className={cn('fa fa-edit', classes.linkIcon, classes.editLink)} />}
              key={'dashboard.edit_app' + params.row.id}
              label={getLanguageFromKey('dashboard.edit_app', language)}
              onClick={() => (window.location.href = editUrl)}
              showInMenu={false}
            />,
            <GridActionsCellItem
              icon={<i className={cn('fa fa-copy', classes.dropdownIcon)} />}
              key={'dashboard.make_copy' + params.row.id}
              label={getLanguageFromKey('dashboard.make_copy', language)}
              onClick={() => setCopyCurrentRepoName(repoFullName)}
              showInMenu
            />,
            <GridActionsCellItem
              icon={<i className={cn('fa fa-newtab', classes.dropdownIcon)} />}
              key={'dashboard.open_in_new' + params.row.id}
              label={getLanguageFromKey('dashboard.open_in_new', language)}
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

  const handleCloseCopyModal = () => {
    setCopyCurrentRepoName(null);
  };

  const componentPropsLabelOverrides = useMemo(() => {
    return {
      pagination: {
        labelRowsPerPage: getLanguageFromKey('dashboard.rows_per_page', language),
      },
    };
  }, [language]);

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
