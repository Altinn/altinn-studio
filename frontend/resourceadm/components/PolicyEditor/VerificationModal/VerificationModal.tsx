import React from 'react';
import classes from './VerificationModal.module.css';
import Modal from 'react-modal';
import { Button, Heading, Paragraph } from '@digdir/design-system-react';

const modalStyles = {
  content: {
    width: '450px',
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
      <Heading size='xsmall' spacing level={2}>
        Slett regel?
      </Heading>
      <div className={classes.contentDivider} />
      <Paragraph size='small'>{text}</Paragraph>
      <div className={classes.buttonWrapper}>
        <div className={classes.closeButtonWrapper}>
          <Button onClick={onClose} variant='quiet'>
            {closeButtonText}
          </Button>
        </div>
        <Button onClick={onPerformAction} color='primary'>
          {actionButtonText}
        </Button>
      </div>
    </Modal>
  );
};
