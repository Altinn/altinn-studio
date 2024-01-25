import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { StudioButton } from '@studio/components';
import { CogIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import { SettingsModal } from './SettingsModal';

export type SettingsModalButtonProps = {
  org: string;
  app: string;
};

/**
 * @component
 *    Displays a button to open the Settings modal
 */
export const SettingsModalButton = ({ org, app }: SettingsModalButtonProps): ReactNode => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <StudioButton
        onClick={() => setIsOpen(true)}
        size='small'
        variant='tertiary'
        color='inverted'
        icon={<CogIcon />}
      >
        {t('settings_modal.heading')}
      </StudioButton>
      {
        // Done to prevent API calls to be executed before the modal is open
        isOpen && (
          <SettingsModal isOpen={isOpen} onClose={() => setIsOpen(false)} org={org} app={app} />
        )
      }
    </>
  );
};
