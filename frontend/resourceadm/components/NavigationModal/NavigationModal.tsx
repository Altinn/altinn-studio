import React from 'react';
import classes from './NavigationModal.module.css';
import { Button } from '@digdir/design-system-react';
import { Modal } from '../Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: () => void;
  title: string;
}

/**
 * Displays the modal telling the user that there is a merge conflict
 *
 * @param props.isOpen boolean for if the modal is open or not
 * @param props.onClose function to close the modal
 * @param props.onNavigate function that handles the navigation when ok is clicked
 * @param props.title the title of the modal
 */
export const NavigationModal = ({ isOpen, onClose, onNavigate, title }: Props) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className={classes.text}>
        Er du sikker på at du vil gå videre til en annen side før du har fikset feilene du har?
      </p>
      <div className={classes.buttonWrapper}>
        <div className={classes.closeButton}>
          <Button onClick={onClose} color='primary' variant='quiet'>
            Gå tilbake
          </Button>
        </div>
        <Button onClick={onNavigate} color='primary'>
          Videre
        </Button>
      </div>
    </Modal>
  );
};
