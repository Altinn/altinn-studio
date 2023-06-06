import React from 'react';
import classes from './VerificationModal.module.css';
import Modal from 'react-modal';
import { Button } from '@digdir/design-system-react';

const modalStyles = {
  content: {
    width: 'fit-content',
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
  text: string;
  closeButtonText: string;
  actionButtonText: string;
  onPerformAction: () => void;
}

/**
 * Displays a verification modal. To be used when the user needs one extra level
 * of chekcing if they really want to perform an action.
 *
 * @param props.isOpen boolean for if the modal is open or not
 * @param props.onClose function to be executed when closing the modal
 * @param props.closeButtonText the text to display on the close button
 * @param props.actionButtonText the text to display on the action button
 * @param props.onPerformAction function to be executed when the action button is clicked
 */
export const VerificationModal = ({
  isOpen,
  onClose,
  text,
  closeButtonText,
  actionButtonText,
  onPerformAction,
}: Props) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel='Verification Modal'
      style={modalStyles}
      ariaHideApp={false}
    >
      <p className={classes.modalText}>{text}</p>
      <div className={classes.buttonWrapper}>
        <Button type='button' onClick={onClose}>
          {closeButtonText}
        </Button>
        <Button type='button' onClick={onPerformAction} color='danger'>
          {actionButtonText}
        </Button>
      </div>
    </Modal>
  );
};
