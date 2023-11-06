import React, { ReactNode } from 'react';
import classes from './StudioModal.module.css';
import ReactModal from 'react-modal'; // TODO - Replace with component from Designsystemet. Issue:
import { Button } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { MultiplyIcon } from '@altinn/icons';

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
 * @property {boolean}[isOpen] - Fucntion to execute when closing modal
 * @property {boolean}[isOpen] - Title of the modal
 * @property {boolean}[isOpen] - Content in the modal
 *
 * @returns {ReactNode} - The rendered component
 */
export const StudioModal = ({ isOpen, onClose, title, children }: StudioModalProps): ReactNode => {
  const { t } = useTranslation();

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onClose}
      className={classes.modal}
      overlayClassName={classes.modalOverlay}
      ariaHideApp={false}
    >
      <div className={classes.headingWrapper}>
        {title}
        <div className={classes.closeButtonWrapper}>
          <Button
            variant='tertiary'
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
