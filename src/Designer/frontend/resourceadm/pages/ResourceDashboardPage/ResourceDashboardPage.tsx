import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import classes from './ResourceDashboardPage.module.css';
import { PlusCircleIcon, MigrationIcon, TasklistIcon } from '@studio/icons';
import { ResourceTable } from '../../components/ResourceTable';
import { SearchBox } from '../../components/ResourceSearchBox';
import { useGetResourceListQuery, useOrganizationsQuery } from '../../hooks/queries';
import { NewResourceModal } from '../../components/NewResourceModal';
import { ImportResourceModal } from '../../components/ImportResourceModal';
import { filterTableData } from '../../utils/resourceListUtils';
import { useTranslation } from 'react-i18next';
import { getResourceDashboardURL, getResourcePageURL } from '../../utils/urlUtils';
import { getReposLabel } from 'dashboard/utils/repoUtils';
import { useUrlParams } from '../../hooks/useUrlParams';
import { StudioButton, StudioHeading, StudioSpinner } from '@studio/components';
import { ImportAltinn3ResourceModal } from '../../components/ImportAltinn3ResourceModal';
import { useImportResourceFromAltinn3Mutation } from '../../hooks/mutations/useImportResourceFromAltinn3Mutation';
import type { EnvId } from '../../utils/resourceUtils';
import type { Resource } from 'app-shared/types/ResourceAdm';
import { ButtonRouterLink } from 'app-shared/components/ButtonRouterLink';

/**
 * @component
 *    Displays the page for the resource dashboard
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceDashboardPage = (): React.JSX.Element => {
  const createResourceModalRef = useRef<HTMLDialogElement>(null);
  const importAltinn2ServiceModalRef = useRef<HTMLDialogElement>(null);
  const importAltinn3ResourceModalRef = useRef<HTMLDialogElement>(null);
  const { org, app } = useUrlParams();
  const { data: organizations } = useOrganizationsQuery();

  const { mutate: importResource, isPending: isImportingResource } =
    useImportResourceFromAltinn3Mutation(org);

  const { t } = useTranslation();

  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState('');
  const [importData, setImportData] = useState<{
    resourceId: string;
    availableEnvs: EnvId[];
  } | null>(null);

  const {
    data: resourceListData,
    isPending: resourceListPending,
    isRefetching: refetchingList,
  } = useGetResourceListQuery(org);

  const filteredResourceList = filterTableData(searchValue, resourceListData ?? []);

  const handleNavigateToResource = (id: string) => {
    navigate(getResourcePageURL(org, app, id, 'about'));
  };

  const handleImportResource = (resourceId: string, env: EnvId) => {
    importAltinn3ResourceModalRef.current?.close();
    const payload = {
      resourceId: resourceId,
      environment: env,
    };

    importResource(payload, {
      onSuccess: (data: Resource) => {
        toast.success(
          t('resourceadm.dashboard_import_resource_success', {
            resourceName: data.title?.nb,
          }),
        );
        handleNavigateToResource(resourceId);
      },
    });
  };

  const onClickImportResource = (resourceId: string, envs: EnvId[]): void => {
    setImportData({ resourceId: resourceId, availableEnvs: envs as EnvId[] });
    if (envs.length === 1) {
      handleImportResource(resourceId, envs[0]);
    } else {
      importAltinn3ResourceModalRef.current.showModal();
    }
  };

  /**
   * Display different content based on the loading state
   */
  const displayContent = () => {
    if (resourceListPending || refetchingList) {
      return (
        <div className={classes.spinnerWrapper}>
          <StudioSpinner data-size='xl' aria-label={t('resourceadm.dashboard_spinner')} />
        </div>
      );
    } else {
      return (
        <>
          <SearchBox onChange={(value: string) => setSearchValue(value)} />
          <div>
            <StudioHeading data-size='xs' level={2}>
              {t('resourceadm.dashboard_num_resources', { num: resourceListData?.length ?? 0 })}
            </StudioHeading>
          </div>
          <ResourceTable
            list={filteredResourceList}
            onClickEditResource={handleNavigateToResource}
            onClickImportResource={onClickImportResource}
            importResourceId={isImportingResource ? importData?.resourceId : ''}
          />
        </>
      );
    }
  };

  return (
    <div className={classes.pageWrapper}>
      <div className={classes.topWrapper}>
        <StudioHeading data-size='lg' level={1}>
          {getReposLabel({
            selectedContext: org,
            orgs: organizations ? organizations : [],
            t,
            isResourcesRepo: true,
          })}
        </StudioHeading>
        <div className={classes.topRightWrapper}>
          <ButtonRouterLink
            variant='tertiary'
            size='md'
            to={`${getResourceDashboardURL(org, app)}/accesslists`}
          >
            <strong>{t('resourceadm.dashboard_change_organization_lists')}</strong>
            <TasklistIcon />
          </ButtonRouterLink>
          <div className={classes.verticalDivider} data-color='neutral' />
          <StudioButton
            variant='tertiary'
            onClick={() => importAltinn2ServiceModalRef.current.showModal()}
            data-size='md'
            icon={<MigrationIcon />}
            iconPlacement='right'
          >
            <strong>{t('resourceadm.dashboard_import_resource')}</strong>
          </StudioButton>
          <div className={classes.verticalDivider} data-color='neutral' />
          <StudioButton
            variant='tertiary'
            onClick={() => createResourceModalRef.current?.showModal()}
            data-size='md'
            icon={<PlusCircleIcon />}
            iconPlacement='right'
          >
            <strong>{t('resourceadm.dashboard_create_resource')}</strong>
          </StudioButton>
        </div>
      </div>
      <div className={classes.horizontalDivider} data-color='neutral' />
      <div className={classes.componentWrapper}>{displayContent()}</div>
      <NewResourceModal
        ref={createResourceModalRef}
        onClose={() => createResourceModalRef.current?.close()}
      />
      <ImportResourceModal
        ref={importAltinn2ServiceModalRef}
        onClose={() => importAltinn2ServiceModalRef.current.close()}
      />
      <ImportAltinn3ResourceModal
        ref={importAltinn3ResourceModalRef}
        availableEnvs={importData?.availableEnvs ?? []}
        onClose={() => importAltinn3ResourceModalRef.current?.close()}
        onImport={(selectedEnv) => handleImportResource(importData.resourceId, selectedEnv)}
      />
    </div>
  );
};
