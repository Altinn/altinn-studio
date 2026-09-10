import { forwardRef } from 'react';

import { Button } from '@app/form-component/app-components/Button';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { Dialog, Heading, Paragraph } from '@digdir/designsystemet-react';
import { QRCodeSVG } from 'qrcode.react';

import classes from './WalletIssuanceDialogLayout.module.css';

export interface WalletIssuanceDialogLayoutProps {
  documentDisplayName: string;
  credentialUrl: string;
  onClose: () => void;
}

export const WalletIssuanceDialogLayout = forwardRef<
  HTMLDialogElement,
  WalletIssuanceDialogLayoutProps
>(({ documentDisplayName, credentialUrl, onClose }, ref) => {
  const { lang } = useTranslation();

  return (
    <Dialog ref={ref} modal closedby='any'>
      <Dialog.Block>
        <Heading level={2}>{lang('wallet.issue_title')}</Heading>
      </Dialog.Block>
      <Dialog.Block>
        <Paragraph>{lang('wallet.issue_description', [documentDisplayName])}</Paragraph>
        <div className={classes.qrContainer}>
          <QRCodeSVG
            value={credentialUrl}
            size={256}
            height={256}
            width={256}
            level='M'
            marginSize={4}
            className={classes.qrCode}
          />
        </div>
        <div className={classes.linkContainer}>
          <Button onClick={() => (window.location.href = credentialUrl)} variant='primary'>
            {lang('wallet.open_wallet_accept')}
          </Button>
        </div>
      </Dialog.Block>
      <Dialog.Block>
        <div className={classes.dialogButtons}>
          <Button onClick={onClose} variant='secondary'>
            {lang('general.close')}
          </Button>
        </div>
      </Dialog.Block>
    </Dialog>
  );
});

WalletIssuanceDialogLayout.displayName = 'WalletIssuanceDialogLayout';
