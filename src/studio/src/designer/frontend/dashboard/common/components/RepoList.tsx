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
} from '@mui/x-data-grid';
import { makeStyles } from '@material-ui/core';
import cn from 'classnames';

import { MakeCopyModal } from 'common/components/MakeCopyModal';

import { IRepository } from 'app-shared/types';
import { User } from '../../resources/fetchDashboardResources/dashboardSlice';
import { IconButton } from '@mui/material';
import {
  useSetStarredRepoMutation,
  useUnsetStarredRepoMutation,
} from 'services/userApi';

type GetRepoUrl = {
  repoIsClonedLocally: boolean;
  repoFullName: string;
};

const getRepoUrl = ({ repoIsClonedLocally, repoFullName }: GetRepoUrl) => {
  if (!repoIsClonedLocally) {
    return `/Home/Index#/clone-app/${repoFullName}`;
  }

  if (repoFullName.endsWith('-datamodels')) {
    return `#/datamodelling/${repoFullName}`;
  }

  return `/designer/${repoFullName}`;
};

type RepoListType = {
  repos: IRepository[];
  isLoading: boolean;
};

const pageSize = 8;

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
});

export const RepoList = ({ repos = defaultArray, isLoading }: RepoListType) => {
  const classes = useStyles();
  const [copyCurrentRepoName, setCopyCurrentRepoName] = React.useState('');
  const [setStarredRepo] = useSetStarredRepoMutation();
  const [unsetStarredRepo] = useUnsetStarredRepoMutation();

  const [sortModel, setSortModel] = React.useState<GridSortModel>([
    { field: 'commodity', sort: 'asc' },
  ]);

  const copyModalAnchorRef = React.useRef(null);

  const handleSortChange = (newSortModel: GridSortModel) => {
    setSortModel(newSortModel);
  };

  const cols = React.useMemo(() => {
    const favouriteActionCol: GridActionsColDef = {
      field: '',
      headerName: '',
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
              style={{ fontSize: 26 }}
              className={
                repo.user_has_starred ? 'fa fa-fav-filled' : 'fa fa-fav-outline'
              }
            />
          </IconButton>,
        ];
      },
    };

    const columns: GridColDef[] = [
      {
        field: 'name',
        headerName: 'Applikasjon',
        width: 150,
      },
      {
        field: 'owner.created_by',
        headerName: 'Opprettet av',
        // sortable: false,
        width: 160,
        valueGetter: (params: GridValueGetterParams) => {
          const owner = params.row.owner as User;
          return owner.full_name || owner.login;
        },
      },
      {
        field: 'updated_at',
        headerName: 'Sist endret',
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
        type: 'actions',
        align: 'right',
        getActions: (params: GridRowParams) => {
          const editUrl = getRepoUrl({
            repoIsClonedLocally: params.row.is_cloned_to_local,
            repoFullName: params.row.full_name,
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
              <span>Repository</span>{' '}
              <i
                className='fa fa-gitea'
                style={{ fontSize: '2rem', marginLeft: '0.5rem' }}
              />
            </a>,
            <a
              key={params.row.id}
              href={editUrl}
              className={cn(classes.actionLink, classes.editLink)}
            >
              <span>Rediger app</span>{' '}
              <i
                className='fa fa-edit'
                style={{ fontSize: '2rem', marginLeft: '0.5rem' }}
              />
            </a>,
            <GridActionsCellItem
              icon={<i className='fa fa-copy' style={{ fontSize: '2rem' }} />}
              key={params.row.id}
              onClick={handleDuplicateClick}
              showInMenu={true}
              label='Lag kopi'
            />,
            <GridActionsCellItem
              icon={<i className='fa fa-newtab' style={{ fontSize: '2rem' }} />}
              key={params.row.id}
              onClick={handleOpenInNewClick}
              showInMenu={true}
              label='Åpne i ny fane'
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
    setStarredRepo,
    unsetStarredRepo,
  ]);

  const handleCloseCopyModal = () => {
    setCopyCurrentRepoName(null);
  };

  return (
    <div style={{ width: '100%' }} ref={copyModalAnchorRef}>
      <DataGrid
        autoHeight={true}
        loading={isLoading}
        rows={repos}
        columns={cols}
        pageSize={pageSize}
        rowsPerPageOptions={[pageSize]}
        sortingMode='server'
        sortModel={sortModel}
        onSortModelChange={handleSortChange}
        disableColumnMenu={true}
        isRowSelectable={() => false}
      />
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
