import React, { forwardRef, useState } from 'react';
import classes from './NewResourceModal.module.css';
import { Button } from '@digdir/design-system-react';
import { Modal } from '../Modal';
import { ResourceNameAndId } from '../ResourceNameAndId';
import { useCreateResourceMutation } from 'resourceadm/hooks/mutations';
import { useNavigate, useParams } from 'react-router-dom';
import type { NewResource } from 'app-shared/types/ResourceAdm';
import { getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { useTranslation } from 'react-i18next';
import { replaceWhiteSpaceWithHyphens } from 'resourceadm/utils/stringUtils';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

export type NewResourceModalProps = {
  onClose: () => void;
};

/**
 * @component
 *    Displays the modal telling the user that there is a merge conflict
 *
 * @property {function}[onClose] - Function to handle close
 *
 * @returns {JSX.Element} - The rendered component
 */
export const NewResourceModal = forwardRef<HTMLDialogElement, NewResourceModalProps>(
  ({ onClose }, ref): JSX.Element => {
    const { t } = useTranslation();

    const navigate = useNavigate();

    const { selectedContext } = useParams();
    const repo = `${selectedContext}-resources`;

    const [id, setId] = useState('');
    const [title, setTitle] = useState('');
    const [editIdFieldOpen, setEditIdFieldOpen] = useState(false);
    const [resourceIdExists, setResourceIdExists] = useState(false);
    const [bothFieldsHaveSameValue, setBothFieldsHaveSameValue] = useState(true);

    // Mutation function to create new resource
    const { mutate: createNewResource } = useCreateResourceMutation(selectedContext);

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
        onSuccess: () =>
          navigate(getResourcePageURL(selectedContext, repo, idAndTitle.identifier, 'about')),
        onError: (error: any) => {
          if (error.response.status === ServerCodes.Conflict) {
            setResourceIdExists(true);
            setEditIdFieldOpen(true);
          }
        },
      });
    };

    /**
     * Replaces the spaces in the value typed with '-'.
     */
    const handleIDInput = (val: string) => {
      setId(replaceWhiteSpaceWithHyphens(val));
      setResourceIdExists(false);
    };

    /**
     * Updates the value of the title. If the edit field is not open,
     * then it updates the ID to the same as the title.
     *
     * @param val the title value typed
     */
    const handleEditTitle = (val: string) => {
      if (!editIdFieldOpen && bothFieldsHaveSameValue) {
        setId(replaceWhiteSpaceWithHyphens(val));
      }
      setTitle(val);
    };

    /**
     * Handles the click of the edit button. If we click the edit button
     * so that it closes the edit field, the id is set to the title.
     *
     * @param isOpened the value of the button when it is pressed
     * @param saveChanges if the save button is pressed, keep id and title separate
     */
    const handleClickEditButton = (isOpened: boolean, saveChanges: boolean) => {
      setEditIdFieldOpen(isOpened);
      if (saveChanges) {
        setBothFieldsHaveSameValue(false);
        return;
      }
      if (!isOpened) {
        setBothFieldsHaveSameValue(true);
        const shouldSetTitleToId = title !== id;
        if (shouldSetTitleToId) {
          setId(replaceWhiteSpaceWithHyphens(title));
        }
      }
    };

    /**
     * Closes the modal and resets the fields
     */
    const handleClose = () => {
      onClose();
      setId('');
      setTitle('');
      setEditIdFieldOpen(false);
      setResourceIdExists(false);
    };

    return (
      <Modal
        ref={ref}
        onClose={handleClose}
        title={t('resourceadm.dashboard_create_modal_title')}
        contentClassName={classes.contentWidth}
      >
        <ResourceNameAndId
          isEditOpen={editIdFieldOpen}
          title={title}
          text={t('resourceadm.dashboard_create_modal_resource_name_and_id_text')}
          id={id}
          handleEditTitle={handleEditTitle}
          handleIdInput={handleIDInput}
          handleClickEditButton={(saveChanges: boolean) =>
            handleClickEditButton(!editIdFieldOpen, saveChanges)
          }
          resourceIdExists={resourceIdExists}
          bothFieldsHaveSameValue={bothFieldsHaveSameValue}
          className={classes.resourceNameAndId}
        />
        <div className={classes.buttonWrapper}>
          <div className={classes.closeButton}>
            <Button onClick={onClose} color='first' variant='tertiary' size='small'>
              {t('general.cancel')}
            </Button>
          </div>
          <Button
            onClick={() =>
              !(id.length === 0 || title.length === 0) ? handleCreateNewResource() : undefined
            }
            color='first'
            aria-disabled={id.length === 0 || title.length === 0}
            size='small'
          >
            {t('resourceadm.dashboard_create_modal_create_button')}
          </Button>
        </div>
      </Modal>
    );
  },
);

NewResourceModal.displayName = 'NewResourceModal';
