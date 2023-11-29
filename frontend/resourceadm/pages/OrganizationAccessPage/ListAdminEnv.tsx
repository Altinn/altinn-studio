import { TestLister } from './listeTestData';
import { Button, Heading } from '@digdir/design-system-react';
import React, { useEffect, useState } from 'react';
import { OrganizationAccessPage } from './OrganizationAccessPage';

interface ListAdminEnvProps {
  env: string;
}

export const ListAdminEnv = ({ env }: ListAdminEnvProps): React.ReactNode => {
  const [listId, setListId] = useState<number>(0);

  useEffect(() => {
    setListId(0);
  }, [env]);
  const envLists = TestLister.filter((x) => x.env === env);

  return (
    <div style={{ margin: '1rem' }}>
      {listId ? (
        <OrganizationAccessPage id={listId} env={env} onBack={() => setListId(0)} />
      ) : (
        <>
          <Heading level={2} size='medium'>{`Lister i ${env}`}</Heading>
          {envLists.map((x) => {
            return (
              <Button variant='tertiary' onClick={() => setListId(x.id)} key={x.id}>
                {x.navn}
              </Button>
            );
          })}
          <Button onClick={() => setListId(-1)}>Opprett ny liste</Button>
        </>
      )}
    </div>
  );
};
