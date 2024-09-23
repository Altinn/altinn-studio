import type { ReactNode } from 'react';
import React from 'react';
import classes from './Modal.module.css';
import cn from 'classnames';
import { Heading } from '@digdir/designsystemet-react';
import { ResourceadmModal } from './ResourceadmModal';
import { useTranslation } from 'react-i18next';

type ModalProps = {
  isOpen: boolean;
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
 * @returns {React.JSX.Element} - The rendered component
 */
export const Modal = ({
  isOpen,
  title,
  onClose,
  children,
  contentClassName,
}: ModalProps): React.JSX.Element => {
  const { t } = useTranslation();
  return (
    <ResourceadmModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className={classes.headingWrapper}>
          <Heading size='xsmall' level={1}>
            {title}
          </Heading>
        </div>
      }
      closeButtonLabel={t('resourceadm.close_modal')}
    >
      <div className={cn(classes.content, contentClassName)}>{children}</div>
    </ResourceadmModal>
  );
};
