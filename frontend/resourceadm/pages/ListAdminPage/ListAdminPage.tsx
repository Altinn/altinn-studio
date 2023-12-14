import React, { useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
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
        Tilbake til dashboard
      </DigdirLink>
      <Heading level={1} size='large'>
        Administrer enhetslister i ressurseierstyrt rettighetsregister
      </Heading>
      <Paragraph size='small'>Velg miljø:</Paragraph>
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
            Opprett ny enhetsliste
          </Button>
        </div>
      )}
    </div>
  );
};
