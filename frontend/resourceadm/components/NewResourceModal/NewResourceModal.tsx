import React, { useState } from 'react';
import classes from './NewResourceModal.module.css';
import { Button } from '@digdir/design-system-react';
import { Modal } from '../Modal';
import { ResourceNameAndId } from '../ResourceNameAndId';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateNewResource: (id: string, title: string) => void;
  resourceIdExists: boolean;
}

/**
 * Displays the modal telling the user that there is a merge conflict
 *
 * @param props.isOpen boolean for if the modal is open or not
 * @param props.onClose function to close the modal
 * @param props.onCreateNewResource function that handles the creation of a new resource
 * @param props.resourceIdExists flag for id the ID already exists
 */
export const NewResourceModal = ({
  isOpen,
  onClose,
  onCreateNewResource,
  resourceIdExists,
}: Props) => {
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [editIdFieldOpen, setEditIdFieldOpen] = useState(false);

  /**
   * Replaces the spaces in the value typed with '-'.
   */
  const handleIDInput = (val: string) => {
    setId(val.replace(/\s/g, '-'));
  };

  /**
   * Updates the value of the title. If the edit field is not open,
   * then it updates the ID to the same as the title.
   *
   * @param val the title value typed
   */
  const handleEditTitle = (val: string) => {
    if (!editIdFieldOpen) {
      setId(val.replace(/\s/g, '-'));
    }
    setTitle(val);
  };

  /**
   * Handles the click of the edit button. If we click the edit button
   * so that it closes the edit field, the id is set to the title.
   *
   * @param isOpened the value of the button when it is pressed
   */
  const handleClickEditButton = (isOpened: boolean) => {
    setEditIdFieldOpen(isOpened);

    // If we stop editing, set the ID to the title
    if (!isOpened) {
      if (title !== id) setId(title.replace(/\s/g, '-'));
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
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title='Opprett ny ressurs'>
      <ResourceNameAndId
        isEditOpen={editIdFieldOpen}
        title={title}
        id={id}
        handleEditTitle={handleEditTitle}
        handleIdInput={handleIDInput}
        handleClickEditButton={() => handleClickEditButton(!editIdFieldOpen)}
        resourceIdExists={resourceIdExists}
      />
      {/* TODO - Add if the id is valid or not based on API calls later */}
      <div className={classes.buttonWrapper}>
        <div className={classes.closeButton}>
          <Button onClick={onClose} color='primary' variant='quiet'>
            Avbryt
          </Button>
        </div>
        <Button
          onClick={() => onCreateNewResource(id, title)}
          color='primary'
          disabled={id.length === 0 || title.length === 0}
        >
          Opprett ressurs
        </Button>
      </div>
    </Modal>
  );
};
