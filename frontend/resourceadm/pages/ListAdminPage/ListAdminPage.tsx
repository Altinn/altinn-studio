import React, { useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heading, Link as DigdirLink, ToggleGroup } from '@digdir/design-system-react';
import { StudioSpinner, StudioButton } from '@studio/components';
import { PencilWritingIcon, PlusIcon } from '@studio/icons';
import classes from './ListAdminPage.module.css';
import { useGetAccessListsQuery } from '../../hooks/queries/useGetAccessListsQuery';
import { NewAccessListModal } from '../../components/NewAccessListModal';
import { getAccessListPageUrl, getResourceDashboardURL } from '../../utils/urlUtils';
import { useUrlParams } from '../../hooks/useSelectedContext';
import type { EnvId } from '../../utils/resourceUtils/resourceUtils';
import { getAvailableEnvironments } from '../../utils/resourceUtils/resourceUtils';

export const ListAdminPage = (): React.JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedContext, repo, env: selectedEnv } = useUrlParams();

  const { data: envListData, isLoading: isLoadingEnvListData } = useGetAccessListsQuery(
    selectedContext,
    selectedEnv,
  );

  const navigateToListEnv = useCallback(
    (navigateEnv: EnvId) => {
      navigate(getAccessListPageUrl(selectedContext, repo, navigateEnv));
    },
    [selectedContext, repo, navigate],
  );

  useEffect(() => {
    if (!selectedEnv) {
      const availableEnvs = getAvailableEnvironments(selectedContext);
      navigateToListEnv(availableEnvs[0].id);
    }
  }, [selectedContext, selectedEnv, navigateToListEnv]);

  const createAccessListModalRef = useRef<HTMLDialogElement>(null);

  return (
    <div className={classes.listAdminPageWrapper}>
      <DigdirLink as={Link} to={getResourceDashboardURL(selectedContext, repo)}>
        {t('resourceadm.listadmin_back')}
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
              env={selectedEnv}
              navigateUrl={getAccessListPageUrl(selectedContext, repo, selectedEnv)}
              onClose={() => createAccessListModalRef.current?.close()}
            />
            {isLoadingEnvListData && <StudioSpinner />}
            {envListData && (
              <div>
                <Heading level={2} size='xsmall'>
                  {t('resourceadm.listadmin_lists_in', {
                    environment: t(
                      getAvailableEnvironments(selectedContext).find(
                        (listEnv) => listEnv.id === selectedEnv,
                      ).label,
                    ),
                  })}
                </Heading>
                {envListData.map((list) => {
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
