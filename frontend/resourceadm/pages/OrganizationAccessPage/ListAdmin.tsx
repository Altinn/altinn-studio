import { Link, useParams } from 'react-router-dom';
import { TestLister } from './listeTestData';
import { Button, Heading } from '@digdir/design-system-react';
import React, { useState } from 'react';
import { OrganizationAccessPage } from './OrganizationAccessPage';
import { ListAdminEnv } from './ListAdminEnv';

export const ListAdmin = (): React.ReactNode => {
  const { org: selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;

  const [selectedEnv, setSelectedEnv] = useState<string>('');
  const envs = ['tt02', 'prod', 'at22', 'at23'];
  return (
    <div style={{ margin: '1rem' }}>
      <Link to={`/${selectedContext}/${repo}/`}>Tilbake til dashboard</Link>
      <Heading level={1} size='large'>
        Administrer lister
      </Heading>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
        {envs.map((x) => {
          return (
            <Button
              onClick={() => setSelectedEnv(x)}
              variant={selectedEnv === x ? 'primary' : 'secondary'}
              key={x}
            >{`Lister i ${x}`}</Button>
          );
        })}
      </div>
      {selectedEnv && <ListAdminEnv env={selectedEnv} />}
    </div>
  );
};
