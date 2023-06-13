import React, { useState } from 'react';
import classes from './NewResourceModal.module.css';
import Modal from 'react-modal';
import { Button, TextField } from '@digdir/design-system-react';

/**
 * Style the modal
 */
const modalStyles = {
  content: {
    width: '400px',
    height: 'fit-content',
    margin: 'auto',
    paddingBlock: '40px',
    paddingInline: '70px',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
};

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

  /**
   * Replaces the spaces in the value typed with '-'
   */
  const handleIDInput = (val: string) => {
    setId(val.replace(/\s/g, '-'));
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel='Create new resource modal'
      style={modalStyles}
      ariaHideApp={false}
    >
      <h2 className={classes.modalTitle}>Opprett ny ressurs?</h2>
      <div className={classes.textfieldWrapper}>
        <TextField
          placeholder='Id for ressursen...'
          value={id}
          onChange={(e) => handleIDInput(e.target.value)}
          label='Skriv ID på ressursen'
          // TODO - Potentially show error if ID exists
        />
      </div>
      <div className={classes.textfieldWrapper}>
        <TextField
          placeholder='Tittel på ressursen...'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          label='Skriv tittel på ressursen'
        />
      </div>
      <div className={classes.buttonWrapper}>
        <Button
          onClick={() => onCreateNewResource(id, title)}
          color='primary'
          disabled={id.length === 0 || title.length === 0}
        >
          Opprett ny ressurs
        </Button>
        <Button onClick={onClose} color='secondary' variant='outline'>
          Avbryt
        </Button>
      </div>
    </Modal>
  );
};
