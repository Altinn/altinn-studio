import React, { useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heading, Link as DigdirLink, ToggleGroup, Table } from '@digdir/design-system-react';
import { StudioSpinner, StudioButton } from '@studio/components';
import { PencilWritingIcon, PlusIcon } from '@studio/icons';
import classes from './ListAdminPage.module.css';
import { useGetAccessListsQuery } from '../../hooks/queries/useGetAccessListsQuery';
import { NewAccessListModal } from '../../components/NewAccessListModal';
import { getAccessListPageUrl, getResourceDashboardURL } from '../../utils/urlUtils';
import { useUrlParams } from '../../hooks/useSelectedContext';
import { EnvId, getAvailableEnvironments } from '../../utils/resourceUtils/resourceUtils';

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
              <Table size='small'>
                <Table.Head>
                  <Table.Row>
                    <Table.HeaderCell>
                      {t('resourceadm.listadmin_lists_in', {
                        environment: t(
                          getAvailableEnvironments(selectedContext).find(
                            (listEnv) => listEnv.id === selectedEnv,
                          ).label,
                        ),
                      })}
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {envListData.map((x) => {
                    return (
                      <Table.Row key={x.identifier}>
                        <Table.Cell>
                          <div className={classes.tableRowContent}>
                            <div>{x.name}</div>
                            <StudioButton
                              iconPlacement='right'
                              size='small'
                              variant='tertiary'
                              icon={<PencilWritingIcon />}
                              as={Link}
                              to={getAccessListPageUrl(
                                selectedContext,
                                repo,
                                selectedEnv,
                                x.identifier,
                              )}
                            >
                              {t('resourceadm.listadmin_edit_list')}
                            </StudioButton>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
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
