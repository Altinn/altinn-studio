import React, { ReactNode, useState } from 'react';
import { Button } from '@digdir/design-system-react';
import { CogIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import { SettingsModal } from './SettingsModal';

export type SettingsModalButtonProps = {
  /**
   * The org
   */
  org: string;
  /**
   * The app
   */
  app: string;
};

/**
 * @component
 *    Displays a button to open the Settings modal
 *
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {ReactNode} - The rendered component
 */
export const SettingsModalButton = ({ org, app }: SettingsModalButtonProps): ReactNode => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size='small'
        variant='quiet'
        color='inverted'
        icon={<CogIcon />}
      >
        {t('settings_modal.heading')}
      </Button>
      {
        // Done to prevent API calls to be executed before the modal is open
        isOpen && (
          <SettingsModal isOpen={isOpen} onClose={() => setIsOpen(false)} org={org} app={app} />
        )
      }
    </>
  );
};
