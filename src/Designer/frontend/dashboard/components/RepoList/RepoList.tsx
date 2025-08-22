import React from 'react';
import type { RepoIncludingStarredData } from 'dashboard/utils/repoUtils/repoUtils';
import { useTranslation } from 'react-i18next';
import type { DATAGRID_PAGE_SIZE_TYPE } from '../../constants';
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZE_OPTIONS } from '../../constants';
import { StudioTableLocalPagination, StudioTableRemotePagination } from '@studio/components-legacy';
import type { Columns, PaginationTexts, RemotePaginationProps } from '@studio/components-legacy';
import { ActionLinks } from './ActionLinks';
import { FavoriteButton } from './FavoriteButton';
import classes from './RepoList.module.css';
import { RepoNameWithLink } from './RepoNameWithLink';
import { Paragraph } from '@digdir/designsystemet-react';
import { TableSortStorageKey } from '../../types/TableSortStorageKey';

export type RepoListProps = {
  repos: RepoIncludingStarredData[];
  isLoading: boolean;
  isServerSort?: boolean;
  totalRows?: number;
  pageNumber?: number;
  pageSize?: DATAGRID_PAGE_SIZE_TYPE;
  pageSizeOptions?: Array<number>;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (newPageSize: DATAGRID_PAGE_SIZE_TYPE) => void;
  onSortClick?: (columnKey: string) => void;
  sortStorageKey?: TableSortStorageKey;
  sortDirection?: 'asc' | 'desc';
  sortColumn?: string | null;
};

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
  sortStorageKey = TableSortStorageKey.OrgRepos,
  sortDirection,
  sortColumn,
}: RepoListProps): React.ReactElement => {
  const { t } = useTranslation();
  const tableSize = 'small';

  const columns: Columns = [
    {
      accessor: 'favoriteIcon',
      heading: t('dashboard.favorite_status'),
      sortable: false,
      headerCellClass: classes.favoriteIconHeaderCell,
    },
    {
      accessor: 'name',
      heading: t('dashboard.name'),
      sortable: true,
      headerCellClass: classes.nameHeaderCell,
      bodyCellFormatter: (repoFullName: string) => <RepoNameWithLink repoFullName={repoFullName} />,
    },
    {
      accessor: 'createdBy',
      heading: t('dashboard.created_by'),
      sortable: false,
      headerCellClass: classes.createdByHeaderCell,
    },
    {
      accessor: 'updated',
      heading: t('dashboard.last_modified'),
      sortable: true,
      headerCellClass: classes.lastUpdatedHeaderCell,
      bodyCellFormatter: (date: string) =>
        new Date(date).toLocaleDateString('nb', { dateStyle: 'short' }),
    },
    {
      accessor: 'description',
      heading: t('general.description'),
      sortable: true,
    },
    {
      accessor: 'actionIcons',
      heading: t('general.actions'),
      sortable: false,
      headerCellClass: classes.actionIconsHeaderCell,
    },
  ];

  const rows = repos.map((repo) => ({
    id: repo.id,
    favoriteIcon: <FavoriteButton repo={repo} />,
    name: repo.full_name,
    createdBy: repo.owner.full_name || repo.owner.login,
    updated: repo.updated_at,
    description: repo.description,
    actionIcons: <ActionLinks repo={repo} />,
  }));

  const emptyTableFallback = (
    <Paragraph size={tableSize}>{t('dashboard.no_repos_result')}</Paragraph>
  );

  const paginationTexts: PaginationTexts = {
    pageSizeLabel: t('dashboard.rows_per_page'),
    totalRowsText: t('dashboard.total_count'),
    nextButtonAriaLabel: t('general.next'),
    previousButtonAriaLabel: t('general.previous'),
    numberButtonAriaLabel: (number) => `${t('general.page')} ${number}`,
  };

  const paginationProps: RemotePaginationProps = {
    currentPage: pageNumber,
    totalRows,
    totalPages: Math.ceil(totalRows / pageSize),
    pageSize,
    pageSizeOptions,
    onPageChange: (page: number) => onPageChange(page),
    onPageSizeChange,
    paginationTexts,
  };

  return (
    <div>
      {isServerSort ? (
        <StudioTableRemotePagination
          columns={columns}
          rows={rows}
          size={tableSize}
          isLoading={isLoading}
          loadingText={t('dashboard.loading')}
          emptyTableFallback={emptyTableFallback}
          onSortClick={onSortClick}
          pagination={paginationProps}
        />
      ) : (
        <StudioTableLocalPagination
          columns={columns}
          rows={rows}
          size={tableSize}
          isLoading={isLoading}
          loadingText={t('general.loading')}
          emptyTableFallback={emptyTableFallback}
          pagination={paginationProps}
          shouldPersistSort={true}
          sortStorageKey={sortStorageKey}
        />
      )}
    </div>
  );
};
