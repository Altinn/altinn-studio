import React, { ReactNode, forwardRef } from 'react';
import classes from './Modal.module.css';
import cn from 'classnames';
import { Heading } from '@digdir/design-system-react';
import { StudioModal } from '@studio/components';

type ModalProps = {
  title: string;
  onClose?: () => void;
  children: ReactNode;
  contentClassName?: string;
};

/**
 * @component
 *    Modal component implementing the react-modal.
 *
 * @example
 *    <Modal ref={ref} onClose={handleClose} title='Some title'>
 *      <div>...</div>
 *    </Modal>
 *
 * @property {string}[title] - Title to be displayed in the modal
 * @property {function}[onClose] - Function to handle close of the modal
 * @property {ReactNode}[children] - React components inside the Modal
 * @property {string}[contentClassName] - Classname for the content
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const Modal = forwardRef<HTMLDialogElement, ModalProps>(
  ({ title, onClose, children, contentClassName }, ref): React.ReactNode => {
    return (
      <StudioModal
        ref={ref}
        onClose={onClose}
        header={
          <div className={classes.headingWrapper}>
            <Heading size='xsmall' spacing level={1}>
              {title}
            </Heading>
          </div>
        }
        content={<div className={cn(classes.content, contentClassName)}>{children}</div>}
      />
    );
  },
);

Modal.displayName = 'Modal';
