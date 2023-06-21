import React, { useState } from 'react';
import classes from './NewResourceModal.module.css';
import { Button, TextField } from '@digdir/design-system-react';
import { PencilWritingIcon, MultiplyIcon } from '@navikt/aksel-icons';
import { Modal } from '../Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateNewResource: (id: string, title: string) => void;
}

/**
 * Displays the modal telling the user that there is a merge conflict
 *
 * @param props.isOpen boolean for if the modal is open or not
 * @param props.onClose function to close the modal
 * @param props.onCreateNewResource function that handles the creation of a new resource
 */
export const NewResourceModal = ({ isOpen, onClose, onCreateNewResource }: Props) => {
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [editIdFieldOpen, setEditIdFieldOpen] = useState(false);

  /**
   * Replaces the spaces in the value typed with '-'
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
   * Replaces spaces and '.' with '-' so that the ID looks correct
   *
   * @param s the string to format
   *
   * @returns the string formatted
   */
  const formatString = (s: string): string => {
    return s.replace(/[\s.]+/g, '-');
  };

  /**
   * If the edit field is open, then the id to dispay is the actual id
   * value, otherwise it is the title value
   *
   * @returns the formatted value
   */
  const getIdToDisplay = (): string => {
    if (editIdFieldOpen) {
      return formatString(id);
    } else {
      return formatString(title);
    }
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Opprett ny ressurs'>
      <p className={classes.text}>Velg et navn for å opprette ressursen din.</p>
      <div className={classes.textfieldWrapper}>
        <p className={classes.textfieldHeader}>Ressursnavn (Bokmål)</p>
        <TextField
          placeholder='Ressursnavn (Bokmål)'
          value={title}
          onChange={(e) => handleEditTitle(e.target.value)}
          aria-label='Ressursnavn (Bokmål)'
        />
      </div>
      <div className={classes.idWrapper}>
        <div className={classes.idBox}>
          <p className={classes.idText}>id</p>
        </div>
        <p className={classes.text}>
          altinn.svv.<strong>{getIdToDisplay()}</strong>
        </p>
        <div className={classes.editButtonWrapper}>
          <Button
            onClick={() => handleClickEditButton(!editIdFieldOpen)}
            iconPlacement='right'
            icon={
              editIdFieldOpen ? (
                <MultiplyIcon title='Slutt å endre ressurs id' />
              ) : (
                <PencilWritingIcon title='Endre ressurs id' fontSize='1.5rem' />
              )
            }
            variant='outline'
            color={editIdFieldOpen ? 'danger' : 'primary'}
          >
            {editIdFieldOpen ? 'Avbryt redigering' : 'Rediger'}
          </Button>
        </div>
      </div>
      <div className={classes.editFieldWrapper}>
        {editIdFieldOpen && (
          <>
            <p className={classes.textfieldHeader}>Tilpasset id navn</p>
            <TextField
              placeholder='Tilpasset id navn'
              value={id}
              onChange={(e) => handleIDInput(e.target.value)}
              aria-label='Tilpasset ID navn'
              // TODO - Potentially show error if ID exists
            />
          </>
        )}
      </div>
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
          Lagre ressurs
        </Button>
      </div>
    </Modal>
  );
};
