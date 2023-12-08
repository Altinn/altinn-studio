import React, { useState, forwardRef } from 'react';
import { StudioModal, StudioSpinner } from '@studio/components';
import { useCreatePartyListMutation } from 'resourceadm/hooks/mutations/useCreatePartyListMutation';
import { Button } from '@digdir/design-system-react';
import { ResourceNameAndId } from 'resourceadm/components/ResourceNameAndId';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

interface NewPartyListModalProps {
  org: string;
  env: string;
  onClose: () => void;
  onPartyListCreated: (identifier: string) => void;
}

export const NewPartyListModal = forwardRef<HTMLDialogElement, NewPartyListModalProps>(
  ({ org, env, onClose, onPartyListCreated }, ref): JSX.Element => {
    const [id, setId] = useState<string>('');
    const [name, setName] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const { mutate: createPartyList, isPending: isCreatingPartyList } = useCreatePartyListMutation(
      org,
      env,
    );

    const handleCreateNewPartyList = (newId: string, newName: string) => {
      setErrorMessage('');
      const newPartyList = {
        env: env,
        id: '',
        identifier: newId,
        name: newName,
        description: '',
      };

      createPartyList(newPartyList, {
        onSuccess: () => {
          onPartyListCreated(newId);
        },
        onError: (error: any) => {
          if (error.response.status === ServerCodes.Conflict) {
            setErrorMessage('En liste med denne id-en finnes fra før');
          }
        },
      });
    };

    return (
      <StudioModal
        ref={ref}
        onClose={onClose}
        header={'Ny liste'}
        style={{ padding: '1.5rem', width: '35rem' }}
        content={
          <div style={{ paddingBottom: '1rem' }}>
            <ResourceNameAndId
              idLabel='Liste id'
              titleLabel='Listenavn'
              id={id}
              title={name}
              onIdChange={(newId: string) => setId(newId)}
              onTitleChange={(newTitle: string) => setName(newTitle)}
              conflictErrorMessage={errorMessage}
            />
            {isCreatingPartyList && <StudioSpinner />}
          </div>
        }
        footer={
          <>
            <Button
              aria-disabled={id.length === 0 || name.length === 0 || isCreatingPartyList}
              onClick={() => handleCreateNewPartyList(id, name)}
            >
              Opprett liste
            </Button>
            <Button variant='tertiary' onClick={() => onClose()}>
              Avbryt
            </Button>
          </>
        }
      />
    );
  },
);

NewPartyListModal.displayName = 'NewPartyListModal';
