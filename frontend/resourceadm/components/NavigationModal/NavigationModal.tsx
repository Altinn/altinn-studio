import React, { forwardRef } from 'react';
import classes from './NavigationModal.module.css';
import { Button, Paragraph } from '@digdir/design-system-react';
import { Modal } from '../Modal';
import { useTranslation } from 'react-i18next';

export type NavigationModalProps = {
  onClose: () => void;
  onNavigate: () => void;
  title: string;
};

/**
 * @component
 *    Displays the modal telling the user that there is a merge conflict
 *
 * @property {function}[onClose] - Function to handle close
 * @property {function}[onNavigate] - Function to be executed when navigating
 * @property {string}[title] - The title in the modal
 *
 * @returns {JSX.Element} - The rendered component
 */
export const NavigationModal = forwardRef<HTMLDialogElement, NavigationModalProps>(
  ({ onClose, onNavigate, title }, ref): JSX.Element => {
    const { t } = useTranslation();

    return (
      <Modal ref={ref} onClose={onClose} title={title}>
        <Paragraph size='small' className={classes.text}>
          {t('resourceadm.resource_navigation_modal_text')}
        </Paragraph>
        <div className={classes.buttonWrapper}>
          <div className={classes.closeButton}>
            <Button onClick={onClose} color='first' variant='tertiary' size='small'>
              {t('resourceadm.resource_navigation_modal_button_stay')}
            </Button>
          </div>
          <Button onClick={onNavigate} color='first' size='small'>
            {t('resourceadm.resource_navigation_modal_button_move_on')}
          </Button>
        </div>
      </Modal>
    );
  },
);

NavigationModal.displayName = 'NavigationModal';
