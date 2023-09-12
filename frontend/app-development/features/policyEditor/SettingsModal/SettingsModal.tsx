import React, { useState } from 'react';
import classes from './SettingsModal.module.css';
import { Button, Heading } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { CogIcon } from '@navikt/aksel-icons';
import { Modal } from 'app-shared/components/Modal';

/**
 * Displays the settings modal.
 *
 * @returns {React.ReactNode}
 */
export const SettingsModal = (): React.ReactNode => {
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* TODO - Move button to the correct place to open the modal from. Issue: #11047 */}
      <Button onClick={() => setIsOpen(true)}>{t('settings_modal.open_button')}</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={
          <div className={classes.headingWrapper}>
            <CogIcon className={classes.icon} />
            <Heading level={1} size='small'>
              {t('settings_modal.heading')}
            </Heading>
          </div>
        }
      >
        <div>TODO</div>
      </Modal>
    </>
  );
};
