import React, { useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useCreateAccessListMutation } from '../../hooks/mutations/useCreateAccessListMutation';
import { ResourceNameAndId } from '../ResourceNameAndId';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { StudioButton, StudioModal, StudioParagraph } from 'libs/studio-components-legacy/src';
import { getEnvLabel } from '../../utils/resourceUtils';
import type { EnvId } from '../../utils/resourceUtils';
import type { ResourceError } from 'app-shared/types/ResourceAdm';

export interface NewAccessListModalProps {
  org: string;
  env: EnvId;
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

    const { mutate: createAccessList, isPending: isCreatingAccessList } =
      useCreateAccessListMutation(org, env);

    const isSaveButtonDisabled = !id.trim().length || !name.trim().length || isCreatingAccessList;

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
        onSuccess: () => {
          toast.success(t('resourceadm.listadmin_create_list_success', { listname: newName }));
          navigate(`${navigateUrl}${newId}`);
        },
        onError: (error: ResourceError) => {
          if (
            error.response?.status === ServerCodes.Conflict ||
            error.response?.status === ServerCodes.PreconditionFailed
          ) {
            setErrorMessage(t('resourceadm.listadmin_identifier_conflict'));
          }
        },
      });
    };

    const onCloseModal = (): void => {
      setId('');
      setName('');
      setErrorMessage('');
      onClose();
    };

    return (
      <StudioModal.Root>
        <StudioModal.Dialog
          ref={ref}
          heading={t('resourceadm.listadmin_create_list_header', {
            env: t(getEnvLabel(env)),
          })}
          closeButtonTitle={t('resourceadm.close_modal')}
          onClose={onCloseModal}
          footer={
            <>
              <StudioButton
                aria-disabled={isSaveButtonDisabled}
                onClick={() => {
                  if (!isSaveButtonDisabled) {
                    handleCreateNewAccessList(id, name);
                  }
                }}
              >
                {t('resourceadm.listadmin_confirm_create_list')}
              </StudioButton>
              <StudioButton variant='tertiary' onClick={onCloseModal}>
                {t('general.cancel')}
              </StudioButton>
            </>
          }
        >
          <StudioParagraph size='sm'>
            {t('resourceadm.listadmin_create_list_description')}
          </StudioParagraph>
          <ResourceNameAndId
            idLabel={t('resourceadm.listadmin_list_id')}
            titleLabel={t('resourceadm.listadmin_list_name')}
            id={id}
            title={name}
            onIdChange={(newId: string) => setId(newId)}
            onTitleChange={(newTitle: string) => setName(newTitle)}
            conflictErrorMessage={errorMessage}
          />
        </StudioModal.Dialog>
      </StudioModal.Root>
    );
  },
);

NewAccessListModal.displayName = 'NewAccessListModal';
