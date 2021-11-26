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

import { MakeCopyModal } from 'common/components/MakeCopyModal';

import { IRepository } from 'app-shared/types';
import { User } from '../../resources/fetchDashboardResources/dashboardSlice';

type GetRepoUrl = {
  repoIsClonedLocally: boolean;
  repoFullName: string;
};

const getRepoUrl = ({ repoIsClonedLocally, repoFullName }: GetRepoUrl) => {
  if (!repoIsClonedLocally) {
    return `/clone-app/${repoFullName}`;
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

const baseHeight = 115;
const rowHeight = 52;
const pageSize = 8;

const getTableHeight = (rows: IRepository[]) => {
  if (!rows || rows.length === 0) {
    return baseHeight;
  }

  const visibleRows = rows.length > pageSize ? pageSize : rows.length;

  const height = baseHeight + rowHeight * visibleRows;

  return height;
};

const defaultArray: IRepository[] = [];

export const RepoList = ({ repos = defaultArray, isLoading }: RepoListType) => {
  const [copyCurrentRepoName, setCopyCurrentRepoName] = React.useState('');
  const [sortModel, setSortModel] = React.useState<GridSortModel>([
    { field: 'commodity', sort: 'asc' },
  ]);

  const copyModalAnchorRef = React.useRef(null);

  const handleSortChange = (newSortModel: GridSortModel) => {
    setSortModel(newSortModel);
  };

  const cols = React.useMemo(() => {
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
        headerName: '',
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
              style={{
                color: '#579b2e',
                marginRight: '1rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Repository{' '}
              <i
                className='fa fa-gitea'
                style={{ fontSize: '2rem', marginLeft: '0.5rem' }}
              />
            </a>,
            <a
              key={params.row.id}
              href={editUrl}
              style={{
                color: '#165db8',
                marginRight: '1rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Rediger app{' '}
              <i
                className='fa fa-edit'
                style={{ fontSize: '2rem', marginLeft: '0.5rem' }}
              />
            </a>,
            <GridActionsCellItem
              icon={<i className='fa fa-copy' />}
              key={params.row.id}
              onClick={handleDuplicateClick}
              showInMenu={true}
              label='Lag kopi'
            />,
            <GridActionsCellItem
              icon={<i className='fa fa-newtab' />}
              key={params.row.id}
              onClick={handleOpenInNewClick}
              showInMenu={true}
              label='Åpne i ny fane'
            />,
          ];
        },
      },
    ];

    return [...columns, ...actionsCol];
  }, []);

  const handleCloseCopyModal = () => {
    setCopyCurrentRepoName(null);
  };

  return (
    <div
      style={{ height: getTableHeight(repos), width: '100%' }}
      ref={copyModalAnchorRef}
    >
      <DataGrid
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
