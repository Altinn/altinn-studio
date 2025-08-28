import React, { forwardRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ResourceNameAndId } from '../ResourceNameAndId';
import { useCreateResourceMutation } from '../../hooks/mutations';
import type { NewResource } from 'app-shared/types/ResourceAdm';
import { getResourcePageURL } from '../../utils/urlUtils';
import { useTranslation } from 'react-i18next';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { useUrlParams } from '../../hooks/useUrlParams';
import { StudioButton, StudioModal, StudioParagraph } from '@studio/components-legacy';
import { getResourceIdentifierErrorMessage } from '../../utils/resourceUtils';

export type NewResourceModalProps = {
  onClose: () => void;
};

/**
 * @component
 *    Displays the modal telling the user that there is a merge conflict
 *
 * @property {function}[onClose] - Function to handle close
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const NewResourceModal = forwardRef<HTMLDialogElement, NewResourceModalProps>(
  ({ onClose }, ref): React.JSX.Element => {
    const { t } = useTranslation();

    const navigate = useNavigate();

    const { org, app } = useUrlParams();

    const [id, setId] = useState('');
    const [title, setTitle] = useState('');
    const [resourceIdExists, setResourceIdExists] = useState(false);

    // Mutation function to create new resource
    const { mutate: createNewResource, isPending: isCreatingResource } =
      useCreateResourceMutation(org);

    const idErrorMessage = getResourceIdentifierErrorMessage(id, resourceIdExists);
    const hasValidValues =
      id.length >= 4 && title.length !== 0 && !idErrorMessage && !isCreatingResource;

    /**
     * Creates a new resource in backend, and navigates if success
     */
    const handleCreateNewResource = () => {
      const idAndTitle: NewResource = {
        identifier: id,
        title: {
          nb: title,
          nn: '',
          en: '',
        },
      };

      createNewResource(idAndTitle, {
        onSuccess: () => {
          toast.success(
            t('resourceadm.dashboard_create_resource_success', {
              resourceName: idAndTitle.title.nb,
            }),
          );
          navigate(getResourcePageURL(org, app, idAndTitle.identifier, 'about'));
        },

        onError: (error: any) => {
          if (error.response.status === ServerCodes.Conflict) {
            setResourceIdExists(true);
          }
        },
      });
    };

    /**
     * Closes the modal and resets the fields
     */
    const handleClose = () => {
      onClose();
      setId('');
      setTitle('');
      setResourceIdExists(false);
    };

    return (
      <StudioModal.Root>
        <StudioModal.Dialog
          ref={ref}
          onClose={handleClose}
          closeButtonTitle={t('resourceadm.close_modal')}
          heading={t('resourceadm.dashboard_create_modal_title')}
          footer={
            <>
              <StudioButton
                onClick={() => (hasValidValues ? handleCreateNewResource() : undefined)}
                color='first'
                aria-disabled={!hasValidValues}
              >
                {t('resourceadm.dashboard_create_modal_create_button')}
              </StudioButton>
              <StudioButton onClick={handleClose} color='first' variant='tertiary'>
                {t('general.cancel')}
              </StudioButton>
            </>
          }
        >
          <StudioParagraph size='sm'>
            {t('resourceadm.dashboard_create_modal_resource_name_and_id_text')}
          </StudioParagraph>
          <ResourceNameAndId
            idLabel={t('resourceadm.dashboard_resource_name_and_id_resource_id')}
            titleLabel={t('resourceadm.dashboard_resource_name_and_id_resource_name')}
            id={id}
            title={title}
            onIdChange={(newId: string) => {
              setResourceIdExists(false);
              setId(newId);
            }}
            onTitleChange={(newTitle: string) => setTitle(newTitle)}
            conflictErrorMessage={idErrorMessage ? t(idErrorMessage) : ''}
          />
        </StudioModal.Dialog>
      </StudioModal.Root>
    );
  },
);

NewResourceModal.displayName = 'NewResourceModal';
