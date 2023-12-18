import React, { useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Heading,
  Link as DigdirLink,
  Paragraph,
  ToggleGroup,
} from '@digdir/design-system-react';
import { StudioSpinner } from '@studio/components';
import classes from './ListAdminPage.module.css';
import { useGetPartyListsQuery } from 'resourceadm/hooks/queries/useGetPartyLists';
import { NewPartyListModal } from '../../components/NewPartyListModal/NewPartyListModal';
import { getPartyListPageUrl, getResourceDashboardURL } from 'resourceadm/utils/urlUtils/urlUtils';

export const ListAdminPage = (): React.ReactNode => {
  const { t } = useTranslation();
  const { selectedContext, env: selectedEnv } = useParams();
  const repo = `${selectedContext}-resources`;

  const { data: envListData, isLoading: isLoadingEnvListData } = useGetPartyListsQuery(
    selectedContext,
    selectedEnv,
  );

  const navigate = useNavigate();
  const createPartyListModalRef = useRef<HTMLDialogElement>(null);

  const envs = ['tt02', 'prod', 'at22', 'at23'];

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
          onChange={(newValue) => navigate(getPartyListPageUrl(selectedContext, repo, newValue))}
          value={selectedEnv}
        >
          {envs.map((environment) => {
            return (
              <ToggleGroup.Item key={environment} value={environment}>
                {environment.toUpperCase()}
              </ToggleGroup.Item>
            );
          })}
        </ToggleGroup>
      </div>
      {selectedEnv && (
        <div className={classes.environmentLinkWrapper}>
          <NewPartyListModal
            ref={createPartyListModalRef}
            org={selectedContext}
            env={selectedEnv}
            onClose={() => createPartyListModalRef.current?.close()}
            onPartyListCreated={(identifier: string) => {
              createPartyListModalRef.current?.close();
              navigate(getPartyListPageUrl(selectedContext, repo, selectedEnv, identifier));
            }}
          />
          {isLoadingEnvListData && <StudioSpinner />}
          {!!envListData &&
            envListData.map((x) => {
              return (
                <div key={x.identifier}>
                  <DigdirLink
                    as={Link}
                    to={getPartyListPageUrl(selectedContext, repo, selectedEnv, x.identifier)}
                  >
                    {x.name}
                  </DigdirLink>
                </div>
              );
            })}
          <Button variant='secondary' onClick={() => createPartyListModalRef.current?.showModal()}>
            {t('resourceadm.listadmin_create_list')}
          </Button>
        </div>
      )}
    </div>
  );
};
