import type { ReactNode } from 'react';
import React, { forwardRef } from 'react';
import classes from './ResourceadmModal.module.css';
import ReactModal from 'react-modal'; // TODO - Replace with component from The Design System. Issue: https://github.com/Altinn/altinn-studio/issues/13269
import { MultiplyIcon } from '@studio/icons';
import { StudioButton } from '@studio/components';

export type ResourceadmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  closeButtonLabel: string;
};

export const ResourceadmModal = forwardRef<HTMLDialogElement, ResourceadmModalProps>(
  ({ isOpen, onClose, title, children, closeButtonLabel, ...rest }, ref): ReactNode => {
    return (
      <ReactModal
        isOpen={isOpen}
        onRequestClose={onClose}
        className={classes.modal}
        overlayClassName={classes.modalOverlay}
        ariaHideApp={false}
        ref={ref}
        {...rest}
      >
        <div className={classes.headingWrapper}>
          <div className={classes.title}>{title}</div>
          <StudioButton
            variant='tertiary'
            icon={<MultiplyIcon />}
            onClick={onClose}
            aria-label={closeButtonLabel}
          />
        </div>
        <div className={classes.contentWrapper}>{children}</div>
      </ReactModal>
    );
  },
);

ResourceadmModal.displayName = 'ResourceadmModal';
