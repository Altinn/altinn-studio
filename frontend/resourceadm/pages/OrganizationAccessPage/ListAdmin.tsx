import { Link, useParams } from 'react-router-dom';
import { Button, Heading } from '@digdir/design-system-react';
import React, { useState } from 'react';
import { OrganizationAccessPage } from './OrganizationAccessPage';
import { useGetPartyListsQuery } from 'resourceadm/hooks/queries/useGetPartyLists';
import { useGetPartyListQuery } from 'resourceadm/hooks/queries/useGetPartyList';
import { useCreatePartyListMutation } from 'resourceadm/hooks/mutations/useCreatePartyListMutation';

export const ListAdmin = (): React.ReactNode => {
  const { selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;

  const [selectedEnv, setSelectedEnv] = useState<string>('');
  const [selectedListId, setSelectedListId] = useState<string>('');

  const { data: envListData } = useGetPartyListsQuery(selectedContext, selectedEnv);
  const { data: list } = useGetPartyListQuery(selectedContext, selectedListId, selectedEnv);
  const { mutate: createPartyList } = useCreatePartyListMutation(selectedContext, selectedEnv);

  const envs = ['tt02', 'prod', 'at22', 'at23'];

  const onChangeEnv = (env: string) => {
    setSelectedEnv(env);
    setSelectedListId('');
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
          {!!list && (
            <OrganizationAccessPage
              org={selectedContext}
              env={selectedEnv}
              list={list}
              onDeleted={() => setSelectedListId('') /*and reload list*/}
            />
          )}
          {!selectedListId && !!envListData && (
            <>
              {envListData.map((x) => {
                return (
                  <Button variant='tertiary' onClick={() => setSelectedListId(x.id)} key={x.id}>
                    {x.name}
                  </Button>
                );
              })}
              <Button onClick={() => setSelectedListId('NY')}>Opprett ny liste</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
