import React, { useState, forwardRef } from 'react';
import { StudioSpinner } from '@studio/components';
import { useCreatePartyListMutation } from 'resourceadm/hooks/mutations/useCreatePartyListMutation';
import { Button, Modal, Paragraph } from '@digdir/design-system-react';
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

    const isSaveButtonDisabled = !id.trim().length || !name.trim().length || isCreatingPartyList;

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
        onSuccess: () => onPartyListCreated(newId),
        onError: (error: any) => {
          if (error.response.status === ServerCodes.Conflict) {
            setErrorMessage('En enhetsliste med denne id-en finnes fra før');
          }
        },
      });
    };

    return (
      <Modal ref={ref} onClose={onClose}>
        <Modal.Header>{`Lag ny enhetsliste i ${env.toUpperCase()}`}</Modal.Header>
        <Modal.Content>
          <div>
            <Paragraph size='small'>
              Velg navn og id for listen. Navnet er for intern bruk, og id er foreslått basert på
              navnet du skriver men kan redigeres om du ønsker en annen. Navn kan endres senere,
              mens id kan ikke endres.
            </Paragraph>
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
        </Modal.Content>
        <Modal.Footer>
          <Button
            aria-disabled={isSaveButtonDisabled}
            onClick={() => {
              if (!isSaveButtonDisabled) {
                handleCreateNewPartyList(id, name);
              }
            }}
          >
            Opprett enhetsliste
          </Button>
          <Button variant='tertiary' onClick={() => onClose()}>
            Avbryt
          </Button>
        </Modal.Footer>
      </Modal>
    );
  },
);

NewPartyListModal.displayName = 'NewPartyListModal';
