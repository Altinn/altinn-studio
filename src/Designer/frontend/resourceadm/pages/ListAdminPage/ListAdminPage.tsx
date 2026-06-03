import React, { useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  StudioSpinner,
  StudioButton,
  StudioLink,
  StudioHeading,
  StudioToggleGroup,
} from '@studio/components';
import { PencilWritingIcon, PlusIcon } from '@studio/icons';
import classes from './ListAdminPage.module.css';
import { useGetAccessListsQuery } from '../../hooks/queries/useGetAccessListsQuery';
import { NewAccessListModal } from '../../components/NewAccessListModal';
import { getAccessListPageUrl, getResourceDashboardURL } from '../../utils/urlUtils';
import { useUrlParams } from '../../hooks/useUrlParams';
import type { EnvId } from '../../utils/resourceUtils';
import { getEnvLabel } from '../../utils/resourceUtils';
import { AccessListErrorMessage } from '../../components/AccessListErrorMessage';
import type { ResourceError } from 'app-shared/types/ResourceAdm';
import { ButtonRouterLink } from 'app-shared/components/ButtonRouterLink';

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

  const avilableEnvironments: EnvId[] = React.useMemo(
    () =>
      org === 'digdir' || org === 'ttd'
        ? ['prod', 'tt02', 'at22', 'at23', 'at24', 'yt01']
        : ['prod', 'tt02'],
    [org],
  );

  useEffect(() => {
    if (!selectedEnv) {
      navigateToListEnv(avilableEnvironments[0], true);
    }
  }, [org, selectedEnv, navigateToListEnv, avilableEnvironments]);

  const handleBackClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    navigate(getResourceDashboardURL(org, app));
  };

  const createAccessListModalRef = useRef<HTMLDialogElement>(null);

  return (
    <div className={classes.listAdminPageWrapper}>
      <StudioLink href={getResourceDashboardURL(org, app)} onClick={handleBackClick}>
        {t('resourceadm.listadmin_back')}
      </StudioLink>
      <StudioHeading level={1} data-size='lg'>
        {t('resourceadm.listadmin_header')}
      </StudioHeading>
      <div className={classes.environmentSelectorWrapper}>
        <StudioToggleGroup
          data-toggle-group=' ' // Todo: Give this element a name: https://github.com/Altinn/altinn-studio/issues/18503
          onChange={(value) => navigateToListEnv(value as EnvId)}
          value={selectedEnv}
        >
          {avilableEnvironments.map((environment) => {
            return (
              <StudioToggleGroup.Item key={environment} value={environment}>
                {t(getEnvLabel(environment))}
              </StudioToggleGroup.Item>
            );
          })}
        </StudioToggleGroup>
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
              <StudioSpinner aria-label={t('resourceadm.loading_env_list')} />
            )}
            {envListData && (
              <div>
                <StudioHeading level={2} data-size='xs'>
                  {t('resourceadm.listadmin_lists_in', {
                    environment: t(getEnvLabel(selectedEnv as EnvId)),
                  })}
                </StudioHeading>
                {envListData.pages.map((list) => {
                  return (
                    <div key={list.identifier} className={classes.tableRowContent}>
                      <div>{list.name}</div>
                      <ButtonRouterLink
                        aria-label={`${t('resourceadm.listadmin_edit_list')} ${list.name}`}
                        icon={<PencilWritingIcon />}
                        iconPlacement='right'
                        to={getAccessListPageUrl(org, app, selectedEnv, list.identifier)}
                        variant='tertiary'
                      >
                        {t('resourceadm.listadmin_edit_list')}
                      </ButtonRouterLink>
                    </div>
                  );
                })}
                {hasNextPage && (
                  <StudioButton
                    disabled={isFetchingNextPage}
                    variant='tertiary'
                    onClick={() => fetchNextPage()}
                  >
                    {t('resourceadm.listadmin_load_more', {
                      unit: t('resourceadm.listadmin_list_unit'),
                    })}
                  </StudioButton>
                )}
              </div>
            )}
            <div>
              <StudioButton
                variant='secondary'
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
