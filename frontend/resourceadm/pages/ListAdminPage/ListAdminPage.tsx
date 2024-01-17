import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heading, Link as DigdirLink, Paragraph, ToggleGroup } from '@digdir/design-system-react';
import { StudioSpinner } from '@studio/components';
import classes from './ListAdminPage.module.css';
import { useGetAccessListsQuery } from '../../hooks/queries/useGetAccessListsQuery';
import { NewAccessListModal } from '../../components/NewAccessListModal';
import { getAccessListPageUrl, getResourceDashboardURL } from '../../utils/urlUtils';
import { useUrlParams } from '../../hooks/useSelectedContext';
import { getAvailableEnvironments } from '../../utils/resourceUtils/resourceUtils';
import { StudioButton } from '@studio/components';

export const ListAdminPage = (): React.ReactNode => {
  const { t } = useTranslation();
  const { selectedContext, repo, env: selectedEnv } = useUrlParams();

  const { data: envListData, isLoading: isLoadingEnvListData } = useGetAccessListsQuery(
    selectedContext,
    selectedEnv,
  );

  const navigate = useNavigate();
  const createAccessListModalRef = useRef<HTMLDialogElement>(null);

  return (
    <div className={classes.listAdminPageWrapper}>
      <DigdirLink as={Link} to={getResourceDashboardURL(selectedContext, repo)}>
        {t('resourceadm.listadmin_back')}
      </DigdirLink>
      <Heading level={1} size='large'>
        {t('resourceadm.listadmin_header')}
      </Heading>
      <Paragraph size='small'>{t('resourceadm.listadmin_select_environment')}</Paragraph>
      <div className={classes.environmentSelectorWrapper}>
        <ToggleGroup
          onChange={(newValue) => navigate(getAccessListPageUrl(selectedContext, repo, newValue))}
          value={selectedEnv}
        >
          {getAvailableEnvironments(selectedContext).map((environment) => {
            return (
              <ToggleGroup.Item key={environment.id} value={environment.id}>
                {t(environment.label)}
              </ToggleGroup.Item>
            );
          })}
        </ToggleGroup>
      </div>
      {selectedEnv && (
        <div className={classes.environmentLinkWrapper}>
          <NewAccessListModal
            ref={createAccessListModalRef}
            org={selectedContext}
            env={selectedEnv}
            navigateUrl={getAccessListPageUrl(selectedContext, repo, selectedEnv)}
            onClose={() => createAccessListModalRef.current?.close()}
          />
          {isLoadingEnvListData && <StudioSpinner />}
          {!!envListData &&
            envListData.map((x) => {
              return (
                <div key={x.identifier}>
                  <DigdirLink
                    as={Link}
                    to={getAccessListPageUrl(selectedContext, repo, selectedEnv, x.identifier)}
                  >
                    {x.name}
                  </DigdirLink>
                </div>
              );
            })}
          <StudioButton
            variant='secondary'
            onClick={() => createAccessListModalRef.current?.showModal()}
          >
            {t('resourceadm.listadmin_create_list')}
          </StudioButton>
        </div>
      )}
    </div>
  );
};
