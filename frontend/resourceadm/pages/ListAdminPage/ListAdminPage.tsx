import React, { useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heading, Link as DigdirLink, ToggleGroup, Button } from '@digdir/design-system-react';
import { StudioSpinner, StudioButton } from '@studio/components';
import { PencilWritingIcon, PlusIcon } from '@studio/icons';
import classes from './ListAdminPage.module.css';
import { useGetAccessListsQuery } from '../../hooks/queries/useGetAccessListsQuery';
import { NewAccessListModal } from '../../components/NewAccessListModal';
import { getAccessListPageUrl, getResourceDashboardURL } from '../../utils/urlUtils';
import { useUrlParams } from '../../hooks/useUrlParams';
import type { EnvId } from '../../utils/resourceUtils';
import { getAvailableEnvironments, getEnvLabel } from '../../utils/resourceUtils';
import { AccessListErrorMessage } from '../../components/AccessListErrorMessage';
import type { ResourceError } from 'app-shared/types/ResourceAdm';

export const ListAdminPage = (): React.JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { org, app, env: selectedEnv } = useUrlParams();

  const {
    data: envListData,
    isLoading: isLoadingEnvListData,
    hasNextPage,
    isFetchingNextPage,
    error: listFetchError,
    fetchNextPage,
  } = useGetAccessListsQuery(org, selectedEnv);

  const navigateToListEnv = useCallback(
    (navigateEnv: EnvId, replace?: boolean) => {
      navigate(getAccessListPageUrl(org, app, navigateEnv), { replace: replace });
    },
    [org, app, navigate],
  );

  useEffect(() => {
    if (!selectedEnv) {
      const availableEnvs = getAvailableEnvironments(org);
      navigateToListEnv(availableEnvs[0].id, true);
    }
  }, [org, selectedEnv, navigateToListEnv]);

  const createAccessListModalRef = useRef<HTMLDialogElement>(null);

  return (
    <div className={classes.listAdminPageWrapper}>
      <DigdirLink asChild>
        <Link to={getResourceDashboardURL(org, app)}>{t('resourceadm.listadmin_back')}</Link>
      </DigdirLink>
      <Heading level={1} size='large'>
        {t('resourceadm.listadmin_header')}
      </Heading>
      <div className={classes.environmentSelectorWrapper}>
        <ToggleGroup size='small' onChange={navigateToListEnv} value={selectedEnv}>
          {getAvailableEnvironments(org).map((environment) => {
            return (
              <ToggleGroup.Item key={environment.id} value={environment.id}>
                {t(environment.label)}
              </ToggleGroup.Item>
            );
          })}
        </ToggleGroup>
        {selectedEnv && (
          <>
            <NewAccessListModal
              ref={createAccessListModalRef}
              org={org}
              env={selectedEnv as EnvId}
              navigateUrl={getAccessListPageUrl(org, app, selectedEnv)}
              onClose={() => createAccessListModalRef.current?.close()}
            />
            {listFetchError && (
              <AccessListErrorMessage
                error={listFetchError as ResourceError}
                env={selectedEnv as EnvId}
              />
            )}
            {isLoadingEnvListData && (
              <StudioSpinner
                showSpinnerTitle={false}
                spinnerTitle={t('resourceadm.loading_env_list')}
              />
            )}
            {envListData && (
              <div>
                <Heading level={2} size='xsmall'>
                  {t('resourceadm.listadmin_lists_in', {
                    environment: t(getEnvLabel(selectedEnv as EnvId)),
                  })}
                </Heading>
                {envListData.pages.map((list) => {
                  return (
                    <div key={list.identifier} className={classes.tableRowContent}>
                      <div>{list.name}</div>
                      <StudioButton
                        iconPlacement='right'
                        size='small'
                        variant='tertiary'
                        icon={<PencilWritingIcon />}
                        aria-label={`${t('resourceadm.listadmin_edit_list')} ${list.name}`}
                        as={Link}
                        to={getAccessListPageUrl(org, app, selectedEnv, list.identifier)}
                      >
                        {t('resourceadm.listadmin_edit_list')}
                      </StudioButton>
                    </div>
                  );
                })}
                {hasNextPage && (
                  <Button
                    disabled={isFetchingNextPage}
                    size='small'
                    variant='tertiary'
                    onClick={() => fetchNextPage()}
                  >
                    {t('resourceadm.listadmin_load_more', {
                      unit: t('resourceadm.listadmin_list_unit'),
                    })}
                  </Button>
                )}
              </div>
            )}
            <div>
              <StudioButton
                variant='secondary'
                size='small'
                icon={<PlusIcon />}
                iconPlacement='left'
                onClick={() => createAccessListModalRef.current?.showModal()}
              >
                {t('resourceadm.listadmin_create_list')}
              </StudioButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
