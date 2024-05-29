import React from 'react';
import type { GridSortModel } from '@mui/x-data-grid';
import type { RepositoryWithStarred } from 'dashboard/utils/repoUtils/repoUtils';
import { useTranslation } from 'react-i18next';
import type { DATAGRID_PAGE_SIZE_TYPE } from '../../constants';
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZE_OPTIONS } from '../../constants';
import { StudioTableLocalPagination, StudioTableRemotePagination } from '@studio/components';
import { ActionLinks } from './ActionLinks';
import { FavoriteButton } from './FavoriteButton';
import classes from './RepoList.module.css';

export interface RepoListProps {
  isLoading: boolean;
  repos?: RepositoryWithStarred[];
  isServerSort?: boolean;
  pageSize?: DATAGRID_PAGE_SIZE_TYPE;
  pageNumber: number;
  rowCount: number;
  onPageChange?: (page: number) => void;
  onSortModelChange?: (newSortModel: GridSortModel) => void;
  onPageSizeChange?: (newPageSize: DATAGRID_PAGE_SIZE_TYPE) => void;
  pageSizeOptions?: Array<number>;
  sortModel?: GridSortModel;
  disableVirtualization?: boolean;
  handleSorting?: (columnKey: string) => void;
}

export const RepoList = ({
  repos = [],
  isLoading,
  pageSize = DATAGRID_DEFAULT_PAGE_SIZE,
  pageNumber,
  isServerSort = false,
  rowCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DATAGRID_PAGE_SIZE_OPTIONS,
  handleSorting,
}: RepoListProps) => {
  const { t } = useTranslation();

  const columns = [
    {
      accessor: 'favoriteIcon',
      value: '',
      sortable: false,
      headerCellClass: classes.favoriteIconHeaderCell,
      bodyCellsClass: classes.favoriteIconBodyCells,
    },
    {
      accessor: 'name',
      value: t('dashboard.name'),
      sortable: true,
      headerCellClass: classes.nameHeaderCell,
    },
    {
      accessor: 'createdBy',
      value: t('dashboard.created_by'),
      sortable: true,
      headerCellClass: classes.createdByHeaderCell,
    },
    {
      accessor: 'lastUpdated',
      value: t('dashboard.last_modified'),
      sortable: true,
      headerCellClass: classes.lastUpdatedHeaderCell,
    },
    {
      accessor: 'description',
      value: t('dashboard.description'),
      sortable: true,
    },
    {
      accessor: 'actionIcons',
      value: '',
      sortable: false,
      headerCellClass: classes.actionIconsHeaderCell,
    },
  ];

  const rows = repos.map((repo) => ({
    id: repo.id,
    favoriteIcon: <FavoriteButton repo={repo} />,
    name: repo.name,
    createdBy: repo.owner.full_name || repo.owner.login,
    lastUpdated: new Date(repo.updated_at).toLocaleDateString('nb', { dateStyle: 'short' }),
    description: repo.description,
    actionIcons: <ActionLinks repo={repo} />,
  }));

  const paginationProps = {
    currentPage: pageNumber + 1,
    totalPages: Math.ceil(rowCount / pageSize),
    pageSize,
    pageSizeOptions,
    pageSizeLabel: t('dashboard.rows_per_page'),
    onPageChange: (page: number) => onPageChange(page - 1),
    onPageSizeChange,
    nextButtonText: t('ux_editor.modal_properties_button_type_next'),
    previousButtonText: t('ux_editor.modal_properties_button_type_back'),
    itemLabel: (num: number) => `${t('general.page')} ${num}`,
  };

  return (
    <div>
      {isServerSort ? (
        <>
          {/*Remember to fix bug on page out of range*/}
          <StudioTableRemotePagination
            columns={columns}
            rows={rows}
            size='small'
            emptyTableMessage={t('dashboard.no_repos_result')}
            pagination={paginationProps}
            onSortClick={handleSorting}
          />
        </>
      ) : (
        <StudioTableLocalPagination
          columns={columns}
          rows={rows}
          size='small'
          emptyTableMessage={t('dashboard.no_repos_result')}
          pagination={{
            pageSize: DATAGRID_PAGE_SIZE_OPTIONS[0],
            pageSizeOptions: DATAGRID_PAGE_SIZE_OPTIONS,
            pageSizeLabel: t('dashboard.rows_per_page'),
            nextButtonText: t('ux_editor.modal_properties_button_type_next'),
            previousButtonText: t('ux_editor.modal_properties_button_type_back'),
            itemLabel: (num: number) => `${t('general.page')} ${num}`,
          }}
        />
      )}
    </div>
  );
};
