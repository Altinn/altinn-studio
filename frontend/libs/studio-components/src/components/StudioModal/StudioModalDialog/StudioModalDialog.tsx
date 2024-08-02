import type { ReactNode } from 'react';
import React, { forwardRef } from 'react';
import { Modal } from '@digdir/designsystemet-react';
import type { ModalDialogProps } from '@digdir/designsystemet-react';
import cn from 'classnames';
import classes from './StudioModalDialog.module.css';
import { useForwardedRef } from '../../../hooks';

export type StudioModalDialogProps = ModalDialogProps & {
  children: ReactNode;
  closeButtonTitle: string; // Todo: Currently not used because of this issue: https://github.com/digdir/designsystemet/issues/2195
  contentPadding?: boolean;
  footer?: ReactNode;
  heading: string;
  icon?: ReactNode;
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
      ...rest
    }: StudioModalDialogProps,
    ref,
  ): ReactNode => {
    const dialogRef = useForwardedRef<HTMLDialogElement>(ref);

    const className = cn(
      givenClassName,
      classes.dialog,
      contentPadding && classes.withContentPadding,
    );

    const closeModal = () => {
      dialogRef.current?.close();
    };

    return (
      <Modal.Dialog
        className={className}
        onInteractOutside={closeModal} // Not possible to test with React testing library because of JSDOM limitations
        ref={dialogRef}
        {...rest}
      >
        <Modal.Header className={classes.heading}>
          {icon && (
            <span className={classes.icon} aria-hidden>
              {icon}
            </span>
          )}
          <span>{heading}</span>
        </Modal.Header>
        <Modal.Content className={classes.content}>{children}</Modal.Content>
        {footer && <Modal.Footer className={classes.footer}>{footer}</Modal.Footer>}
      </Modal.Dialog>
    );
  },
);

StudioModalDialog.displayName = 'StudioModal.Dialog';
