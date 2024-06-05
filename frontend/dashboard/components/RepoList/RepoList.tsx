import React from 'react';
import type { RepositoryWithStarred } from 'dashboard/utils/repoUtils/repoUtils';
import { useTranslation } from 'react-i18next';
import type { DATAGRID_PAGE_SIZE_TYPE } from '../../constants';
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZE_OPTIONS } from '../../constants';
import {
  RemotePaginationProps,
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
  repos: RepositoryWithStarred[];
  isServerSort?: boolean;
  pageSize?: DATAGRID_PAGE_SIZE_TYPE;
  pageNumber?: number;
  totalRows?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (newPageSize: DATAGRID_PAGE_SIZE_TYPE) => void;
  pageSizeOptions?: Array<number>;
  onSortClick?: (columnKey: string) => void;
}

export const RepoList = ({
  repos = [],
  isLoading,
  isServerSort = false,
  totalRows,
  pageNumber,
  pageSize = DATAGRID_DEFAULT_PAGE_SIZE,
  pageSizeOptions = DATAGRID_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
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
      valueFormatter: (repoFullName) => <RepoNameWithLink repoFullName={repoFullName} />,
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
      valueFormatter: (date) => new Date(date).toLocaleDateString('nb', { dateStyle: 'short' }),
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
    },
  ];

  // The local table can sort all columns, but Gitea API does not support sorting by createdBy or description
  const nonSortableAccessors = ['createdBy', 'description'];
  const remotePaginationColumns = columns.map((column) => ({
    ...column,
    sortable: nonSortableAccessors.includes(column.accessor) ? false : column.sortable,
  }));

  const rows = repos.map((repo) => ({
    id: repo.id,
    favoriteIcon: <FavoriteButton repo={repo} />,
    name: repo.full_name,
    createdBy: repo.owner.full_name || repo.owner.login,
    updated: repo.updated_at,
    description: repo.description,
    actionIcons: <ActionLinks repo={repo} />,
  }));

  const emptyTableMessage = isLoading ? (
    <StudioSpinner spinnerTitle={t('general.loading')} />
  ) : (
    t('dashboard.no_repos_result')
  );

  const paginationTexts = {
    pageSizeLabel: t('dashboard.rows_per_page'),
    showingRowText: t('dashboard.showing_row'),
    ofText: t('general.of'),
    nextButtonAriaLabel: t('general.next'),
    previousButtonAriaLabel: t('general.previous'),
    numberButtonAriaLabel: (number) => `${t('general.page')} ${number}`,
  };

  const paginationProps: RemotePaginationProps = {
    currentPage: pageNumber + 1,
    totalRows,
    totalPages: Math.ceil(totalRows / pageSize),
    pageSize,
    pageSizeOptions,
    onPageChange: (page: number) => onPageChange(page - 1),
    onPageSizeChange,
    paginationTexts,
  };

  return (
    <div>
      {isServerSort ? (
        <>
          <StudioTableRemotePagination
            columns={remotePaginationColumns}
            rows={rows}
            size='small'
            emptyTableMessage={emptyTableMessage}
            pagination={paginationProps}
            onSortClick={onSortClick}
          />
        </>
      ) : (
        <StudioTableLocalPagination
          columns={columns}
          rows={rows}
          size='small'
          emptyTableMessage={emptyTableMessage}
          pagination={paginationProps}
        />
      )}
    </div>
  );
};
