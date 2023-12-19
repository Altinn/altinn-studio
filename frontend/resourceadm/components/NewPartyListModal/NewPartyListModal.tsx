import React, { useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components';
import { useCreatePartyListMutation } from 'resourceadm/hooks/mutations/useCreatePartyListMutation';
import { Button, Modal, Paragraph } from '@digdir/design-system-react';
import { ResourceNameAndId } from 'resourceadm/components/ResourceNameAndId';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

interface NewPartyListModalProps {
  org: string;
  env: string;
  navigateUrl: string;
  onClose: () => void;
}

export const NewPartyListModal = forwardRef<HTMLDialogElement, NewPartyListModalProps>(
  ({ org, env, navigateUrl, onClose }, ref): JSX.Element => {
    const { t } = useTranslation();
    const navigate = useNavigate();

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
        onSuccess: () => navigate(`${navigateUrl}${newId}`),
        onError: (error: any) => {
          if (error.response.status === ServerCodes.Conflict) {
            setErrorMessage(t('resourceadm.listadmin_identifier_conflict'));
          }
        },
      });
    };

    return (
      <Modal ref={ref} onClose={onClose}>
        <Modal.Header>
          {t('resourceadm.listadmin_create_list_header', { env: env.toUpperCase() })}
        </Modal.Header>
        <Modal.Content>
          <div>
            <Paragraph size='small'>{t('resourceadm.listadmin_create_list_description')}</Paragraph>
            <ResourceNameAndId
              idLabel={t('resourceadm.listadmin_list_id')}
              titleLabel={t('resourceadm.listadmin_list_name')}
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
            {t('resourceadm.listadmin_confirm_create_list')}
          </Button>
          <Button variant='tertiary' onClick={() => onClose()}>
            {t('general.cancel')}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  },
);

NewPartyListModal.displayName = 'NewPartyListModal';
