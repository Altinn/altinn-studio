import { Link, useParams } from 'react-router-dom';
import { Button, Heading } from '@digdir/design-system-react';
import React, { useState } from 'react';
import { PartyListDetail } from '../../components/PartyListDetails/PartyListDetail';
import { useGetPartyListQuery } from 'resourceadm/hooks/queries/useGetPartyList';
import { ListAdminEnv } from './ListAdminEnv';

export const ListAdminPage = (): React.ReactNode => {
  const { selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;

  const [selectedEnv, setSelectedEnv] = useState<string>('');
  const [selectedListId, setSelectedListId] = useState<string>('');

  const { data: list } = useGetPartyListQuery(selectedContext, selectedListId, selectedEnv);

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
      {selectedEnv && !selectedListId && (
        <ListAdminEnv
          org={selectedContext}
          env={selectedEnv}
          onSelectList={(identifier: string) => setSelectedListId(identifier)}
        />
      )}
      {!!list && (
        <PartyListDetail
          org={selectedContext}
          env={selectedEnv}
          list={list}
          onDeleted={() => setSelectedListId('') /*and reload list, if not automatically*/}
        />
      )}
    </div>
  );
};
