import React, { useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCreateAccessListMutation } from '../../hooks/mutations/useCreateAccessListMutation';
import { Modal, Paragraph } from '@digdir/design-system-react';
import { ResourceNameAndId } from '../../components/ResourceNameAndId';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { StudioButton } from '@studio/components';
import { getAvailableEnvironments } from '../../utils/resourceUtils/resourceUtils';

export interface NewAccessListModalProps {
  org: string;
  env: string;
  navigateUrl: string;
  onClose: () => void;
}

export const NewAccessListModal = forwardRef<HTMLDialogElement, NewAccessListModalProps>(
  ({ org, env, navigateUrl, onClose }, ref): React.JSX.Element => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [id, setId] = useState<string>('');
    const [name, setName] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const { mutate: createAccessList } = useCreateAccessListMutation(org, env);

    const isSaveButtonDisabled = !id.trim().length || !name.trim().length;

    const handleCreateNewAccessList = (newId: string, newName: string) => {
      setErrorMessage('');
      const newAccessList = {
        env: env,
        id: '',
        identifier: newId,
        name: newName,
        description: '',
      };

      createAccessList(newAccessList, {
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
          {t('resourceadm.listadmin_create_list_header', {
            env: t(getAvailableEnvironments(org).find((listEnv) => listEnv.id === env).label),
          })}
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
          </div>
        </Modal.Content>
        <Modal.Footer>
          <StudioButton
            size='small'
            aria-disabled={isSaveButtonDisabled}
            onClick={() => {
              if (!isSaveButtonDisabled) {
                handleCreateNewAccessList(id, name);
              }
            }}
          >
            {t('resourceadm.listadmin_confirm_create_list')}
          </StudioButton>
          <StudioButton size='small' variant='tertiary' onClick={onClose}>
            {t('general.cancel')}
          </StudioButton>
        </Modal.Footer>
      </Modal>
    );
  },
);

NewAccessListModal.displayName = 'NewAccessListModal';
