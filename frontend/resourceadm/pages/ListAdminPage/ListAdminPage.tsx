import React, { useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';
import {
  Heading,
  Link as DigdirLink,
  ToggleGroup,
  Button,
  Alert,
} from '@digdir/design-system-react';
import { StudioSpinner, StudioButton } from '@studio/components';
import { PencilWritingIcon, PlusIcon } from '@studio/icons';
import classes from './ListAdminPage.module.css';
import { useGetAccessListsQuery } from '../../hooks/queries/useGetAccessListsQuery';
import { NewAccessListModal } from '../../components/NewAccessListModal';
import { getAccessListPageUrl, getResourceDashboardURL } from '../../utils/urlUtils';
import { useUrlParams } from '../../hooks/useSelectedContext';
import type { EnvId } from '../../utils/resourceUtils';
import { getAvailableEnvironments, getEnvLabel } from '../../utils/resourceUtils';

export const ListAdminPage = (): React.JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedContext, repo, env: selectedEnv } = useUrlParams();

  const {
    data: envListData,
    isLoading: isLoadingEnvListData,
    hasNextPage,
    isFetchingNextPage,
    error: listFetchError,
    fetchNextPage,
  } = useGetAccessListsQuery(selectedContext, selectedEnv);

  const navigateToListEnv = useCallback(
    (navigateEnv: EnvId, replace?: boolean) => {
      navigate(getAccessListPageUrl(selectedContext, repo, navigateEnv), { replace: replace });
    },
    [selectedContext, repo, navigate],
  );

  useEffect(() => {
    if (!selectedEnv) {
      const availableEnvs = getAvailableEnvironments(selectedContext);
      navigateToListEnv(availableEnvs[0].id, true);
    }
  }, [selectedContext, selectedEnv, navigateToListEnv]);

  const createAccessListModalRef = useRef<HTMLDialogElement>(null);

  return (
    <div className={classes.listAdminPageWrapper}>
      <DigdirLink asChild>
        <Link to={getResourceDashboardURL(selectedContext, repo)}>
          {t('resourceadm.listadmin_back')}
        </Link>
      </DigdirLink>
      <Heading level={1} size='large'>
        {t('resourceadm.listadmin_header')}
      </Heading>
      <div className={classes.environmentSelectorWrapper}>
        <ToggleGroup size='small' onChange={navigateToListEnv} value={selectedEnv}>
          {getAvailableEnvironments(selectedContext).map((environment) => {
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
              org={selectedContext}
              env={selectedEnv as EnvId}
              navigateUrl={getAccessListPageUrl(selectedContext, repo, selectedEnv)}
              onClose={() => createAccessListModalRef.current?.close()}
            />
            {(listFetchError as AxiosError)?.response.status === 403 && (
              <Alert severity='danger'>
                {t('resourceadm.loading_access_list_permission_denied', {
                  envName: t(getEnvLabel(selectedContext, selectedEnv as EnvId)),
                })}
              </Alert>
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
                    environment: t(getEnvLabel(selectedContext, selectedEnv as EnvId)),
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
                        to={getAccessListPageUrl(
                          selectedContext,
                          repo,
                          selectedEnv,
                          list.identifier,
                        )}
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
                    {t('resourceadm.listadmin_load_more')}
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
