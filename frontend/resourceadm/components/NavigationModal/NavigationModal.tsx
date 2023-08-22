import React from 'react';
import classes from './NavigationModal.module.css';
import { Button, Paragraph } from '@digdir/design-system-react';
import { Modal } from '../Modal';

interface Props {
  /**
   * Boolean for if the modal is open
   */
  isOpen: boolean;
  /**
   * Function to handle close
   * @returns void
   */
  onClose: () => void;
  /**
   * Function to be executed when navigating
   * @returns void
   */
  onNavigate: () => void;
  /**
   * The title in the modal
   */
  title: string;
}

/**
 * @component
 *    Displays the modal telling the user that there is a merge conflict
 *
 * @property {boolean}[isOpen] - Boolean for if the modal is open
 * @property {function}[onClose] - Function to handle close
 * @property {function}[onNavigate] - Function to be executed when navigating
 * @property {string}[title] - The title in the modal
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const NavigationModal = ({ isOpen, onClose, onNavigate, title }: Props): React.ReactNode => {
  // TODO - translation
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <Paragraph size='small'>
        Noen felt på siden har manglende informasjon eller feil i utfylling. Du kan endre eller
        fikse informasjonen når som helst før ressursen publiseres.
      </Paragraph>
      <div className={classes.buttonWrapper}>
        <div className={classes.closeButton}>
          <Button onClick={onClose} color='primary' variant='quiet'>
            Bli på siden
          </Button>
        </div>
        <Button onClick={onNavigate} color='primary'>
          Gå videre
        </Button>
      </div>
    </Modal>
  );
};
