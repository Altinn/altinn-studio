import React, { ReactNode } from 'react';
import classes from './Modal.module.css';
import ReactModal from 'react-modal';

/**
 * Style the modal
 */
const modalStyles = {
  content: {
    width: '600px',
    height: 'fit-content',
    margin: 'auto',
    padding: '32px',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
};

interface Props {
  isOpen: boolean;
  title: string;
  onClose?: () => void;
  children: ReactNode;
}

/**
 * Modal component implementing the react-modal.
 *
 * @param props.isOpen boolean for if the modal is open or not
 * @param props.title the title in the modal
 * @param props.onClose function to be executed when the modal is closed
 * @param props.children the components inside the modal
 */
export const Modal = ({ isOpen, title, onClose, children }: Props) => {
  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={() => onClose && onClose()}
      contentLabel={title}
      style={modalStyles}
      ariaHideApp={false}
    >
      <h2 className={classes.modalTitle}>Opprett en ny ressurs</h2>
      <div className={classes.contentDivider} />
      {children}
    </ReactModal>
  );
};
