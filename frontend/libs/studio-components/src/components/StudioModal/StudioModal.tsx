import React, { ReactNode, forwardRef } from 'react';
import classes from './StudioModal.module.css';
import { Modal, ModalProps } from '@digdir/design-system-react';

export type StudioModalProps = {
  header: ReactNode;
  content: ReactNode;
  footer?: ReactNode;
} & Omit<ModalProps, 'header' | 'content' | 'footer'>;

/**
 * @component
 *    Component that displays a Modal for Altinn-studio
 *
 * @example
 *    <StudioModal
 *        ref={ref}
 *        header={<SomeHeaderComponent />}
 *        content={<SomeContentComponent />}
 *        footer={<SomeFooterComponent />}
 *    />
 *
 * @property {ReactNode}[header] - Header of the modal
 * @property {ReactNode}[content] - Content in the mdoal
 * @property {ReactNode}[footer] - Optioanl footer in the modal
 *
 * @returns {JSX.Element} - The rendered component
 */
export const StudioModal = forwardRef<HTMLDialogElement, StudioModalProps>(
  ({ header, content, footer, ...rest }: StudioModalProps, ref): JSX.Element => {
    return (
      <Modal ref={ref} className={classes.modal} {...rest}>
        <Modal.Header className={classes.header}>{header}</Modal.Header>
        <Modal.Content className={classes.content}>{content}</Modal.Content>
        {footer && <Modal.Footer className={classes.footer}>{footer}</Modal.Footer>}
      </Modal>
    );
  },
);

StudioModal.displayName = 'StudioModal';
