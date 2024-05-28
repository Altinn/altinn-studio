import React, { useMemo, useRef, useState } from 'react';
import type {
  GridActionsColDef,
  GridPaginationModel,
  GridRowParams,
  GridSortModel,
} from '@mui/x-data-grid';
import { GridActionsCellItem } from '@mui/x-data-grid';
import cn from 'classnames';
import type { RepositoryWithStarred } from 'dashboard/utils/repoUtils/repoUtils';
import { MakeCopyModal } from '../MakeCopyModal';
import { getRepoEditUrl } from '../../utils/urlUtils';
import { useTranslation } from 'react-i18next';
import type { DATAGRID_PAGE_SIZE_TYPE } from '../../constants';
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZE_OPTIONS } from '../../constants';
import classes from './RepoList.module.css';
import type { User } from 'app-shared/types/Repository';
import { useSetStarredRepoMutation, useUnsetStarredRepoMutation } from '../../hooks/mutations';
import { PencilIcon, FilesIcon, ExternalLinkIcon, StarIcon, StarFillIcon } from '@studio/icons';
import { StudioTableLocalPagination, StudioTableRemotePagination } from '@studio/components';
import { ActionLinks } from './ActionLinks';
import { FavoriteButton } from './FavoriteButton';

export interface IRepoListProps {
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
}

const defaultArray: RepositoryWithStarred[] = [];

export const RepoList = ({
  repos = defaultArray,
  isLoading,
  pageSize = DATAGRID_DEFAULT_PAGE_SIZE,
  pageNumber,
  isServerSort = false,
  rowCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DATAGRID_PAGE_SIZE_OPTIONS,
  handleSorting,
}: IRepoListProps) => {
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    pageSize,
    page: 0,
  });
  const { t } = useTranslation();

  const studioColumns = [
    {
      accessor: 'favoriteIcon',
      value: '',
      width: '42px',
    },
    {
      accessor: 'name',
      value: t('dashboard.name'),
      width: '20%',
    },
    {
      accessor: 'createdBy',
      value: t('dashboard.created_by'),
      width: '20%',
    },
    {
      accessor: 'lastUpdated',
      value: t('dashboard.last_modified'),
      width: '15%',
    },
    {
      accessor: 'description',
      value: t('dashboard.description'),
    },
    {
      accessor: 'actionIcons',
      value: '',
      width: '155px',
    },
  ];

  const studioRows = repos.map((repo) => ({
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
            columns={studioColumns}
            rows={studioRows}
            size='small'
            emptyTableMessage={t('dashboard.no_repos_result')}
            pagination={paginationProps}
            onSortClick={handleSorting}
          />
        </>
      ) : (
        <StudioTableLocalPagination
          columns={studioColumns}
          rows={studioRows}
          size='small'
          emptyTableMessage={t('dashboard.no_repos_result')}
          pagination={{
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
