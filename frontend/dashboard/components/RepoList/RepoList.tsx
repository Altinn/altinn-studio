import React from 'react';
import type { GridSortModel } from '@mui/x-data-grid';
import type { RepositoryWithStarred } from 'dashboard/utils/repoUtils/repoUtils';
import { useTranslation } from 'react-i18next';
import type { DATAGRID_PAGE_SIZE_TYPE } from '../../constants';
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZE_OPTIONS } from '../../constants';
import {
  StudioSpinner,
  StudioTableLocalPagination,
  StudioTableRemotePagination,
} from '@studio/components';
import { ActionLinks } from './ActionLinks';
import { FavoriteButton } from './FavoriteButton';
import classes from './RepoList.module.css';
import { RepoNameWithLink } from './RepoNameWithLink';

export interface RepoListProps {
  isLoading: boolean;
  repos?: RepositoryWithStarred[];
  isServerSort?: boolean;
  pageSize?: DATAGRID_PAGE_SIZE_TYPE;
  pageNumber: number;
  totalRows: number;
  onPageChange?: (page: number) => void;
  onSortModelChange?: (newSortModel: GridSortModel) => void;
  onPageSizeChange?: (newPageSize: DATAGRID_PAGE_SIZE_TYPE) => void;
  pageSizeOptions?: Array<number>;
  sortModel?: GridSortModel;
  disableVirtualization?: boolean;
  onSortClick?: (columnKey: string) => void;
}

export const RepoList = ({
  repos = [],
  isLoading,
  pageSize = DATAGRID_DEFAULT_PAGE_SIZE,
  pageNumber,
  isServerSort = false,
  totalRows,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DATAGRID_PAGE_SIZE_OPTIONS,
  onSortClick,
}: RepoListProps): React.ReactElement => {
  const { t } = useTranslation();

  const columns = [
    {
      accessor: 'favoriteIcon',
      value: '',
      sortable: false,
      headerCellClass: classes.favoriteIconHeaderCell,
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
      accessor: 'updated',
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

  // Gitea API does not support sorting by createdBy or description
  const nonSortableAccessors = ['createdBy', 'description'];
  const remotePaginationColumns = columns.map((column) => ({
    ...column,
    sortable: nonSortableAccessors.includes(column.accessor) ? false : column.sortable,
  }));

  const rows = repos.map((repo) => ({
    id: repo.id,
    favoriteIcon: <FavoriteButton repo={repo} />,
    name: <RepoNameWithLink repo={repo} />,
    createdBy: repo.owner.full_name || repo.owner.login,
    updated: new Date(repo.updated_at).toLocaleDateString('nb', { dateStyle: 'short' }),
    description: repo.description,
    actionIcons: <ActionLinks repo={repo} />,
  }));

  const remoteEmptyTableMessage = isLoading ? (
    <StudioSpinner spinnerTitle={t('general.loading')} />
  ) : (
    t('dashboard.no_repos_result')
  );

  const remotePaginationProps = {
    currentPage: pageNumber + 1,
    totalRows,
    totalPages: Math.ceil(totalRows / pageSize),
    pageSize,
    pageSizeOptions,
    pageSizeLabel: t('dashboard.rows_per_page'),
    onPageChange: (page: number) => onPageChange(page - 1),
    onPageSizeChange,
    nextButtonText: t('ux_editor.modal_properties_button_type_next'),
    previousButtonText: t('ux_editor.modal_properties_button_type_back'),
    itemLabel: (num: number) => `${t('general.page')} ${num}`,
  };

  const localPaginationProps = {
    ...remotePaginationProps,
    pageSizeOptions: DATAGRID_PAGE_SIZE_OPTIONS,
  };

  return (
    <div>
      {isServerSort ? (
        <>
          <StudioTableRemotePagination
            columns={remotePaginationColumns}
            rows={rows}
            size='small'
            emptyTableMessage={remoteEmptyTableMessage}
            pagination={remotePaginationProps}
            onSortClick={onSortClick}
          />
        </>
      ) : (
        <StudioTableLocalPagination
          columns={columns}
          rows={rows}
          size='small'
          emptyTableMessage={t('dashboard.no_repos_result')}
          pagination={localPaginationProps}
        />
      )}
    </div>
  );
};
