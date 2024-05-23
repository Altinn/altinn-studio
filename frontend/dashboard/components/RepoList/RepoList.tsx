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
  onSortModelChange,
  onPageSizeChange,
  pageSizeOptions = DATAGRID_PAGE_SIZE_OPTIONS,
  sortModel,
  disableVirtualization = false,
  handleSorting,
}: IRepoListProps) => {
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    pageSize,
    page: 0,
  });
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const handlePaginationModelChange = (newPaginationModel: GridPaginationModel) => {
    if (newPaginationModel.page !== paginationModel.page) {
      onPageChange?.(newPaginationModel.page);
    }
    if (newPaginationModel.pageSize !== paginationModel.pageSize) {
      onPageSizeChange?.(newPaginationModel.pageSize as DATAGRID_PAGE_SIZE_TYPE);
    }
    setPaginationModel(newPaginationModel);
  };

  const [copyCurrentRepoName, setCopyCurrentRepoName] = useState('');

  const { mutate: setStarredRepo } = useSetStarredRepoMutation();
  const { mutate: unsetStarredRepo } = useUnsetStarredRepoMutation();
  const copyModalAnchorRef = useRef(null);
  const { t } = useTranslation();

  const studioColumns = [
    {
      accessor: 'favoriteIcon',
      value: '',
    },
    {
      accessor: 'name',
      value: t('dashboard.name'),
    },
    {
      accessor: 'createdBy',
      value: t('dashboard.created_by'),
    },
    {
      accessor: 'lastUpdated',
      value: t('dashboard.last_modified'),
    },
    {
      accessor: 'description',
      value: t('dashboard.description'),
    },
    {
      accessor: 'actionIcons',
      value: '',
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

  const cols = useMemo(() => {
    const actionsCol: GridActionsColDef[] = [
      {
        field: 'links',
        width: 400,
        renderHeader: (): null => null,
        type: 'actions',
        align: 'right',
        getActions: (params: GridRowParams) => {
          const repoFullName = params.row.full_name as string;
          const [org, repo] = repoFullName.split('/');
          const isDatamodelling = repoFullName.endsWith('-datamodels');
          const editUrl = getRepoEditUrl({ org, repo });
          const editTextKey = isDatamodelling ? 'dashboard.edit_datamodels' : 'dashboard.edit_app';

          return [
            <GridActionsCellItem
              className={cn(classes.actionLink, classes.repoLink)}
              icon={<i className={cn('fa fa-gitea', classes.linkIcon, classes.repoLink)} />}
              key={`dashboard.repository${params.row.id}`}
              label={t('dashboard.repository_in_list', { appName: repo })}
              onClick={() => (window.location.href = params.row.html_url)}
              showInMenu={false}
              edge='end'
            />,
            <GridActionsCellItem
              className={cn(classes.actionLink, classes.editLink)}
              icon={
                <PencilIcon
                  title={t('dashboard.edit_app_icon')}
                  className={cn(classes.linkIcon, classes.editLink)}
                />
              }
              key={`dashboard.edit_app${params.row.id}`}
              label={t('dashboard.edit_app', { appName: repo })}
              onClick={() => (window.location.href = editUrl)}
              showInMenu={false}
            >
              <a
                key={params.row.id}
                href={params.row.html_url}
                className={cn(classes.actionLink, classes.repoLink)}
              >
                <span>{t(editTextKey)}</span>
                <PencilIcon className={classes.linkIcon} />
              </a>
              ,
            </GridActionsCellItem>,
            <GridActionsCellItem
              icon={<FilesIcon className={classes.dropdownIcon} />}
              key={`dashboard.make_copy${params.row.id}`}
              label={t('dashboard.make_copy')}
              onClick={() => {
                setModalOpen(true);
                setCopyCurrentRepoName(repoFullName);
              }}
              showInMenu
            />,
            <GridActionsCellItem
              icon={<ExternalLinkIcon className={classes.dropdownIcon} />}
              key={`dashboard.open_in_new${params.row.id}`}
              label={t('dashboard.open_in_new')}
              onClick={() => window.open(editUrl, '_blank')}
              showInMenu
            />,
          ];
        },
      },
    ];

    return [...actionsCol];
  }, [setStarredRepo, t, unsetStarredRepo]);

  const handleCloseCopyModal = () => {
    setModalOpen(false);
    setCopyCurrentRepoName(null);
  };

  const paginationProps = {
    currentPage: pageNumber + 1,
    totalPages: Math.ceil(rowCount / pageSize),
    pageSize,
    pageSizeOptions: DATAGRID_PAGE_SIZE_OPTIONS,
    pageSizeLabel: t('dashboard.rows_per_page'),
    onPageChange: (page: number) => onPageChange(page - 1),
    onPageSizeChange,
    nextButtonText: t('ux_editor.modal_properties_button_type_next'),
    previousButtonText: t('ux_editor.modal_properties_button_type_back'),
    itemLabel: (num: number) => `${t('general.page')} ${num}`,
  };

  return (
    <div ref={copyModalAnchorRef}>
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
      {copyCurrentRepoName && (
        <MakeCopyModal
          ref={copyModalAnchorRef}
          open={modalOpen}
          onClose={handleCloseCopyModal}
          serviceFullName={copyCurrentRepoName}
        />
      )}
    </div>
  );
};
