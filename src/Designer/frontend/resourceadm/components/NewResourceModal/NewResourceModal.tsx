import React, { forwardRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCreateResourceMutation } from '../../hooks/mutations';
import type { NewResource } from 'app-shared/types/ResourceAdm';
import { getResourcePageURL } from '../../utils/urlUtils';
import { useTranslation } from 'react-i18next';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { useUrlParams } from '../../hooks/useUrlParams';
import { StudioButton, StudioDialog, StudioParagraph, StudioTextfield } from '@studio/components';
import {
  getResourceIdentifierErrorMessage,
  getValidIdentifierPrefixes,
} from '../../utils/resourceUtils';
import { ResourceAdmDialogContent } from '../ResourceAdmDialogContent/ResourceAdmDialogContent';
import { formatIdString } from '../../utils/stringUtils';

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

    const [id, setId] = useState(`${org}-`);
    const [resourceIdExists, setResourceIdExists] = useState(false);

    // Mutation function to create new resource
    const { mutate: createNewResource, isPending: isCreatingResource } =
      useCreateResourceMutation(org);

    const idErrorMessage = getResourceIdentifierErrorMessage(id, org, resourceIdExists);
    const hasValidValues =
      id.length >= 4 &&
      !idErrorMessage &&
      !isCreatingResource &&
      getValidIdentifierPrefixes(org).every((prefix) => id !== prefix);

    /**
     * Creates a new resource in backend, and navigates if success
     */
    const handleCreateNewResource = () => {
      const idAndTitle: NewResource = {
        identifier: id,
        title: {
          nb: '',
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
      setId(`${org}-`);
      setResourceIdExists(false);
    };

    return (
      <StudioDialog ref={ref} onClose={handleClose}>
        <ResourceAdmDialogContent
          heading={t('resourceadm.dashboard_create_modal_title')}
          footer={
            <>
              <StudioButton
                onClick={() => (hasValidValues ? handleCreateNewResource() : undefined)}
                aria-disabled={!hasValidValues}
              >
                {t('resourceadm.dashboard_create_modal_create_button')}
              </StudioButton>
              <StudioButton onClick={handleClose} variant='tertiary'>
                {t('general.cancel')}
              </StudioButton>
            </>
          }
        >
          <StudioParagraph spacing>
            {t('resourceadm.dashboard_create_modal_resource_name_and_id_text')}
          </StudioParagraph>
          <StudioTextfield
            label={t('resourceadm.dashboard_resource_name_and_id_resource_id')}
            value={id}
            onChange={(event) => {
              setResourceIdExists(false);
              const newId = formatIdString(event.target.value);
              setId(newId);
            }}
            error={
              idErrorMessage
                ? t(idErrorMessage, {
                    orgPrefix: `${getValidIdentifierPrefixes(org).join(` ${t('expression.or')} `)}`,
                  })
                : ''
            }
          />
        </ResourceAdmDialogContent>
      </StudioDialog>
    );
  },
);

NewResourceModal.displayName = 'NewResourceModal';
