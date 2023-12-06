import React, { ReactNode, useRef } from 'react';
import { Button } from '@digdir/design-system-react';
import { CogIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import { SettingsModal } from './SettingsModal';

export type SettingsModalButtonProps = {
  org: string;
  app: string;
};

/**
 * @component
 *    Displays a button to open the Settings modal and the Settings modal
 *
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {ReactNode} - The rendered component
 */
export const SettingsModalButton = ({ org, app }: SettingsModalButtonProps): ReactNode => {
  const { t } = useTranslation();

  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button
        onClick={() => modalRef.current?.showModal()}
        size='small'
        variant='tertiary'
        color='inverted'
        icon={<CogIcon />}
      >
        {t('settings_modal.heading')}
      </Button>
      <SettingsModal ref={modalRef} onClose={() => modalRef.current?.close()} org={org} app={app} />
    </>
  );
};
