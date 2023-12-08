import React, { useRef } from 'react';
import { StudioSpinner } from '@studio/components';
import { useGetPartyListsQuery } from 'resourceadm/hooks/queries/useGetPartyLists';
import { Button } from '@digdir/design-system-react';
import { CreatePartyListModal } from './CreatePartyListModal';

interface ListAdminEnvProps {
  org: string;
  env: string;
  onSelectList: (identifier: string) => void;
}

export const ListAdminEnv = ({ org, env, onSelectList }: ListAdminEnvProps): React.ReactNode => {
  const { data: envListData, isLoading: isLoadingEnvListData } = useGetPartyListsQuery(org, env);

  const createPartyListModalRef = useRef<HTMLDialogElement>(null);

  return (
    <div>
      <CreatePartyListModal
        ref={createPartyListModalRef}
        org={org}
        env={env}
        onClose={() => createPartyListModalRef.current?.close()}
        onPartyListCreated={(identifier: string) => {
          createPartyListModalRef.current?.close();
          onSelectList(identifier);
        }}
      />
      {isLoadingEnvListData && <StudioSpinner />}
      {!!envListData && (
        <>
          {envListData.map((x) => {
            return (
              <Button
                key={x.identifier}
                variant='tertiary'
                onClick={() => onSelectList(x.identifier)}
              >
                {x.name}
              </Button>
            );
          })}
        </>
      )}
      <Button onClick={() => createPartyListModalRef.current?.showModal()}>Opprett ny liste</Button>
    </div>
  );
};
