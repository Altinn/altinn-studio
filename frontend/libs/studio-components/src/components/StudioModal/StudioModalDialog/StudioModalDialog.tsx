import type { ReactNode } from 'react';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Modal } from '@digdir/designsystemet-react';
import type { ModalDialogProps } from '@digdir/designsystemet-react';
import cn from 'classnames';
import classes from './StudioModalDialog.module.css';

export type StudioModalDialogProps = ModalDialogProps & {
  children: ReactNode;
  closeButtonTitle?: string; // Todo: Currently not used because of this issue: https://github.com/digdir/designsystemet/issues/2195
  contentPadding?: boolean;
  footer?: ReactNode;
  icon?: ReactNode;
  subheading?: string;
};
export const StudioModalDialog = forwardRef<HTMLDialogElement, StudioModalDialogProps>(
  (
    {
      children,
      className: givenClassName,
      closeButtonTitle,
      contentPadding = true,
      footer,
      heading,
      icon,
      subheading,
      ...rest
    }: StudioModalDialogProps,
    ref,
  ): ReactNode => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    useImperativeHandle(ref, () => dialogRef.current, []);

    const className = cn(
      givenClassName,
      classes.dialog,
      contentPadding && classes.withContentPadding,
    );

    const closeModal = () => {
      dialogRef.current?.close();
    };

    return (
      <Modal.Dialog className={className} ref={dialogRef} onInteractOutside={closeModal} {...rest}>
        <Modal.Header className={classes.heading}>
          {icon && <span className={classes.icon}>{icon}</span>}
          <span>{heading}</span>
        </Modal.Header>
        <Modal.Content className={classes.content}>{children}</Modal.Content>
        {footer && <Modal.Footer>{footer}</Modal.Footer>}
      </Modal.Dialog>
    );
  },
);

StudioModalDialog.displayName = 'StudioModal.Dialog';
