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

// import { CloneDialog } from './CloneDialog';

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

export const RepoList = ({ repos, isLoading }: RepoListType) => {
  const [showDuplicateDialog, setShowDuplicateDialog] = React.useState(false);
  const [sortModel, setSortModel] = React.useState<GridSortModel>([
    { field: 'commodity', sort: 'asc' },
  ]);

  const handleSortChange = (newSortModel: GridSortModel) => {
    setSortModel(newSortModel);
  };

  console.log(repos);

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
        const owner = params.getValue(params.id, 'owner') as User;
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

  const actionsCol: GridActionsColDef[] = React.useMemo(() => {
    return [
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
            setShowDuplicateDialog(true);
          };

          const handleOpenInNewClick = () => {
            window.open(editUrl, '_blank');
          };

          return [
            <a key={params.row.id} href={params.row.html_url}>
              Repository
            </a>,
            <a key={params.row.id} href={editUrl}>
              Rediger app
            </a>,
            <GridActionsCellItem
              icon={<i className='fa fa-ellipsismenu' />}
              key={params.row.id}
              onClick={handleDuplicateClick}
              showInMenu={true}
              label='Lag kopi'
            />,
            <GridActionsCellItem
              icon={<i className='fa fa-ellipsismenu' />}
              key={params.row.id}
              onClick={handleOpenInNewClick}
              showInMenu={true}
              label='Åpne i ny fane'
            />,
          ];
        },
      },
    ];
  }, []);

  const cols = [...columns, ...actionsCol];

  // const handleCloseCloneDialog = () => {
  //   setShowDuplicateDialog(false);
  // };

  return (
    <div style={{ height: 600, width: '100%' }}>
      <DataGrid
        loading={isLoading}
        rows={repos}
        columns={cols}
        pageSize={8}
        rowsPerPageOptions={[5]}
        sortingMode='server'
        sortModel={sortModel}
        onSortModelChange={handleSortChange}
        disableColumnMenu={true}
        isRowSelectable={() => false}
      />
      {showDuplicateDialog && <div />}
    </div>
  );
};
