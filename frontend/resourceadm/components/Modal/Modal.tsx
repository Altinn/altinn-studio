import React, { ReactNode } from 'react';
import classes from './Modal.module.css';
import cn from 'classnames';
import { Heading } from '@digdir/design-system-react';
import { Modal as SharedModal } from 'app-shared/components/Modal';

type ModalProps = {
  /**
   * Boolean for if the modal is open
   */
  isOpen: boolean;
  /**
   * Title to be displayed in the modal
   */
  title: string;
  /**
   * Function to handle close of the modal
   * @returns void
   */
  onClose?: () => void;
  /**
   * React components inside the Modal
   */
  children: ReactNode;
  /**
   * Classname for the content
   */
  contentClassName?: string;
};

/**
 * @component
 *    Modal component implementing the react-modal.
 *
 * @example
 *    <Modal isOpen={isOpen} onClose={handleClose} title='Some title'>
 *      <div>...</div>
 *    </Modal>
 *
 * @property {boolean}[isOpen] - Boolean for if the modal is open
 * @property {string}[title] - Title to be displayed in the modal
 * @property {function}[onClose] - Function to handle close of the modal
 * @property {ReactNode}[children] - React components inside the Modal
 * @property {string}[contentClassName] - Classname for the content
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const Modal = ({
  isOpen,
  title,
  onClose,
  children,
  contentClassName,
}: ModalProps): React.ReactNode => {
  return (
    <SharedModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className={classes.headingWrapper}>
          <Heading size='xsmall' spacing level={1}>
            {title}
          </Heading>
        </div>
      }
    >
      <div className={cn(classes.content, contentClassName)}>{children}</div>
    </SharedModal>
  );
};
