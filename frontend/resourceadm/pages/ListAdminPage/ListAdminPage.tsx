import React, { useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button, Heading, Link as DigdirLink } from '@digdir/design-system-react';
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
        Administrer lister
      </Heading>
      <div className={classes.environmentSelectorWrapper}>
        {envs.map((environment) => {
          return (
            <Button
              key={environment}
              variant={selectedEnv === environment ? 'primary' : 'secondary'}
              as={Link}
              to={getPartyListPageUrl(selectedContext, repo, environment)}
            >{`Lister i ${environment}`}</Button>
          );
        })}
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
            Opprett ny liste
          </Button>
        </div>
      )}
    </div>
  );
};
