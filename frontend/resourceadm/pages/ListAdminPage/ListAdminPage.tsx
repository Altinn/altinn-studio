import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Heading } from '@digdir/design-system-react';
import { ListAdminEnv } from './ListAdminEnv';
import { getPartyListPageUrl } from 'resourceadm/utils/urlUtils/urlUtils';

export const ListAdminPage = (): React.ReactNode => {
  const { selectedContext, env: selectedEnv } = useParams();
  const repo = `${selectedContext}-resources`;

  const envs = ['tt02', 'prod', 'at22', 'at23'];

  return (
    <div style={{ margin: '1rem' }}>
      <Link to={`/${selectedContext}/${repo}/`}>Tilbake til dashboard</Link>
      <Heading level={1} size='large'>
        Administrer lister
      </Heading>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
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
      {selectedEnv && <ListAdminEnv />}
    </div>
  );
};
