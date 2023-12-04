import React from 'react';
import classes from './VerificationModal.module.css';
import { Button, Heading, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { StudioModal } from '@studio/components';

export type VerificationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  closeButtonText: string;
  actionButtonText: string;
  onPerformAction: () => void;
};

/**
 * @component
 *    Displays a verification modal. To be used when the user needs one extra level
 *    of chekcing if they really want to perform an action.
 *
 * @property {boolean}[isOpen] - Boolean for if the modal is open or not
 * @property {function}[onClose] - Function to be executed when closing the modal
 * @property {string}[text] -The text to display in the modal
 * @property {string}[closeButtonText] - The text to display on the close button
 * @property {string}[actionButtonText] - The text to display on the action button
 * @property {function}[onPerformAction] - Function to be executed when the action button is clicked
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const VerificationModal = ({
  isOpen,
  onClose,
  text,
  closeButtonText,
  actionButtonText,
  onPerformAction,
}: VerificationModalProps): React.ReactNode => {
  const { t } = useTranslation();

  return (
    <StudioModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className={classes.headingWrapper}>
          <Heading size='xsmall' spacing level={1}>
            {t('policy_editor.verification_modal_heading')}
          </Heading>
        </div>
      }
    >
      <div className={classes.content}>
        <Paragraph size='small'>{text}</Paragraph>
        <div className={classes.buttonWrapper}>
          <div className={classes.closeButtonWrapper}>
            <Button onClick={onClose} variant='tertiary' size='small'>
              {closeButtonText}
            </Button>
          </div>
          <Button onClick={onPerformAction} color='danger' size='small'>
            {actionButtonText}
          </Button>
        </div>
      </div>
    </StudioModal>
  );
};
