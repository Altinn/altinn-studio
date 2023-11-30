import { Link, useParams } from 'react-router-dom';
import { ListMembers, TestLister } from './listeTestData';
import { Button, Heading } from '@digdir/design-system-react';
import React, { useState } from 'react';
import { OrganizationAccessPage } from './OrganizationAccessPage';

export const ListAdmin = (): React.ReactNode => {
  const { org: selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;

  const [selectedEnv, setSelectedEnv] = useState<string>('');
  const [selectedListId, setSelectedListId] = useState<number>(0);

  const envs = ['tt02', 'prod', 'at22', 'at23'];

  const onChangeEnv = (env: string) => {
    setSelectedEnv(env);
    setSelectedListId(0);
  };

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
              onClick={() => onChangeEnv(x)}
              variant={selectedEnv === x ? 'primary' : 'secondary'}
              key={x}
            >{`Lister i ${x}`}</Button>
          );
        })}
      </div>
      {selectedEnv && (
        <div>
          {selectedListId ? (
            <OrganizationAccessPage
              list={ListMembers.find((x) => x.id === selectedListId)}
              onDeleted={() => setSelectedListId(0) /*and reload list*/}
            />
          ) : (
            <>
              {TestLister.filter((x) => x.env === selectedEnv).map((x) => {
                return (
                  <Button variant='tertiary' onClick={() => setSelectedListId(x.id)} key={x.id}>
                    {x.title}
                  </Button>
                );
              })}
              <Button onClick={() => setSelectedListId(-1)}>Opprett ny liste</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
