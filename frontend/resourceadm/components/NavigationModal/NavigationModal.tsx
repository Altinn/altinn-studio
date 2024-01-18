import React from 'react';
import classes from './NavigationModal.module.css';
import { Paragraph } from '@digdir/design-system-react';
import { Modal } from '../Modal';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';

export type NavigationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: () => void;
  title: string;
};

/**
 * @component
 *    Displays the modal telling the user that there is a merge conflict
 *
 * @property {boolean}[isOpen] - Boolean for if the modal is open
 * @property {function}[onClose] - Function to handle close
 * @property {function}[onNavigate] - Function to be executed when navigating
 * @property {string}[title] - The title in the modal
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const NavigationModal = ({
  isOpen,
  onClose,
  onNavigate,
  title,
}: NavigationModalProps): React.ReactNode => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <Paragraph size='small' className={classes.text}>
        {t('resourceadm.resource_navigation_modal_text')}
      </Paragraph>
      <div className={classes.buttonWrapper}>
        <StudioButton onClick={onClose} color='first' variant='tertiary' size='small'>
          {t('resourceadm.resource_navigation_modal_button_stay')}
        </StudioButton>
        <StudioButton onClick={onNavigate} color='first' size='small'>
          {t('resourceadm.resource_navigation_modal_button_move_on')}
        </StudioButton>
      </div>
    </Modal>
  );
};
