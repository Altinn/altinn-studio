import React, { ReactNode } from 'react';
import classes from './Modal.module.css';
import ReactModal from 'react-modal'; // TODO - Replace with component from Designsystemet. Issue:
import { Button } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { MultiplyIcon } from '@navikt/aksel-icons';

export type ModalProps = {
  /**
   * Flag for if the modal is open
   */
  isOpen: boolean;
  /**
   * Fucntion to execute when closing modal
   * @returns void
   */
  onClose: () => void;
  /**
   * Title of the modal
   */
  title: ReactNode;
  /**
   * Content in the modal
   */
  children: ReactNode;
};

/**
 * @component
 *    Component that displays a Modal
 *
 * @example
 *    <Modal
 *      isOpen={isOpen}
 *      onClose={() => setIsOpen(false)}
 *      title={
 *        <div>
 *          <SomeIcon />
 *          <Heading level={2} size='small'>Some name</Heading>
 *        </div>
 *      }
 *    >
 *      <div>
 *        <SomeChildrenComponents />
 *      </div>
 *    </Modal>
 *
 * @property {boolean}[isOpen] - Flag for if the modal is open
 * @property {boolean}[isOpen] - Fucntion to execute when closing modal
 * @property {boolean}[isOpen] - Title of the modal
 * @property {boolean}[isOpen] - Content in the modal
 *
 * @returns {ReactNode} - The rendered component
 */
export const Modal = ({ isOpen, onClose, title, children }: ModalProps): ReactNode => {
  const { t } = useTranslation();

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onClose}
      ariaHideApp={false}
      className={classes.modal}
      overlayClassName={classes.modalOverlay}
    >
      <div className={classes.headingWrapper}>
        {title}
        <div className={classes.closeButtonWrapper}>
          <Button
            variant='quiet'
            icon={<MultiplyIcon />}
            onClick={onClose}
            aria-label={t('modal.close_icon')}
          />
        </div>
      </div>
      <div className={classes.contentWrapper}>{children}</div>
    </ReactModal>
  );
};
