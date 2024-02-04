import type { ReactNode } from 'react';
import React, { forwardRef } from 'react';
import classes from './StudioModal.module.css';
import ReactModal from 'react-modal'; // TODO - Replace with component from Designsystemet. Issue:
import { useTranslation } from 'react-i18next';
import { MultiplyIcon } from '@studio/icons';
import { StudioButton } from '../StudioButton';

export type StudioModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
};

/**
 * @component
 *    Component that displays a Modal for Altinn-studio
 *
 * @example
 *    <StudioModal
 *      isOpen={isOpen}
 *      onClose={() => setIsOpen(false)}
 *      title={
 *        <div>
 *          <SomeIcon />
 *          <Heading level={1} size='small'>Some name</Heading>
 *        </div>
 *      }
 *    >
 *      <div>
 *        <SomeChildrenComponents />
 *      </div>
 *    </StudioModal>
 *
 * @property {boolean}[isOpen] - Flag for if the modal is open
 * @property {function}[onClose] - Fucntion to execute when closing modal
 * @property {ReactNode}[title] - Title of the modal
 * @property {ReactNode}[children] - Content in the modal
 *
 * @returns {ReactNode} - The rendered component
 */
export const StudioModal = forwardRef<HTMLDialogElement, StudioModalProps>(
  ({ isOpen, onClose, title, children, ...rest }: StudioModalProps, ref): ReactNode => {
    const { t } = useTranslation();

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
            aria-label={t('modal.close_icon')}
          />
        </div>
        <div className={classes.contentWrapper}>{children}</div>
      </ReactModal>
    );
  },
);

StudioModal.displayName = 'StudioModal';
