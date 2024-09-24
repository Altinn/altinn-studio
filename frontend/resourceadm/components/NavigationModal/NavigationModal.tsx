import React, { forwardRef } from 'react';
import { Paragraph } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioModal } from '@studio/components';

export type NavigationModalProps = {
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
 * @returns {React.JSX.Element} - The rendered component
 */

export const NavigationModal = forwardRef<HTMLDialogElement, NavigationModalProps>(
  ({ onClose, onNavigate, title }, ref): React.JSX.Element => {
    const { t } = useTranslation();

    return (
      <StudioModal.Root>
        <StudioModal.Dialog
          ref={ref}
          onClose={onClose}
          heading={title}
          closeButtonTitle={t('resourceadm.close_modal')}
          footer={
            <>
              <StudioButton onClick={onNavigate} color='first'>
                {t('resourceadm.resource_navigation_modal_button_move_on')}
              </StudioButton>
              <StudioButton onClick={onClose} color='first' variant='tertiary'>
                {t('resourceadm.resource_navigation_modal_button_stay')}
              </StudioButton>
            </>
          }
        >
          <Paragraph size='small'>{t('resourceadm.resource_navigation_modal_text')}</Paragraph>
        </StudioModal.Dialog>
      </StudioModal.Root>
    );
  },
);

NavigationModal.displayName = 'NavigationModal';
