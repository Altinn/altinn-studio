import { forwardRef } from 'react';

import { Button } from '@app/form-component/app-components/Button';
import { Panel } from '@app/form-component/app-components/Panel';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { DocumentDataPreview } from '@app/form-component/layout-components/Lommebok/DocumentDataPreview';
import { Dialog, Heading, List, Paragraph } from '@digdir/designsystemet-react';
import { QRCodeSVG } from 'qrcode.react';
import type { PresentationField } from '@app/form-component/layout-components/Lommebok/PresentationValue';

import classes from './WalletVerificationDialogLayout.module.css';

export type WalletVerificationDialogState =
  | { mode: 'confirm' }
  | { mode: 'failed' }
  | { mode: 'claimsSave'; fields: PresentationField[] }
  | { mode: 'claimsDownload'; claims: Record<string, unknown> }
  | { mode: 'qr'; authorizationUrl: string }
  | { mode: 'hidden' };

export interface WalletVerificationDialogLayoutProps {
  documentDisplayName: string;
  /** Claim titles shown on the confirmation screen (either the configured field titles, or the credential catalog's claim names). */
  claimTitles: string[];
  state: WalletVerificationDialogState;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
  onSave: () => void;
  onDownloadXsd: () => void;
}

export const WalletVerificationDialogLayout = forwardRef<
  HTMLDialogElement,
  WalletVerificationDialogLayoutProps
>(
  (
    {
      documentDisplayName,
      claimTitles,
      state,
      onConfirm,
      onCancel,
      onClose,
      onSave,
      onDownloadXsd,
    },
    ref,
  ) => {
    const { lang } = useTranslation();

    const content = getDialogContent();

    function getDialogContent() {
      if (state.mode === 'confirm') {
        return (
          <>
            <Dialog.Block>
              <Heading level={2}>{lang('wallet.confirm_request_title')}</Heading>
            </Dialog.Block>
            <Dialog.Block>
              <Paragraph>{lang('wallet.confirm_request_description')}</Paragraph>
              <Heading level={3} data-size='sm'>
                {documentDisplayName}
              </Heading>
              <Paragraph>{lang('wallet.confirm_claims_description')}</Paragraph>
              <List.Unordered className={classes.claimsList}>
                {claimTitles.map((title, index) => (
                  <List.Item key={index}>{title}</List.Item>
                ))}
              </List.Unordered>
            </Dialog.Block>
            <Dialog.Block>
              <div className={classes.dialogButtons}>
                <Button onClick={onConfirm} variant='primary'>
                  {lang('wallet.confirm_proceed')}
                </Button>
                <Button onClick={onCancel} variant='secondary'>
                  {lang('general.cancel')}
                </Button>
              </div>
            </Dialog.Block>
          </>
        );
      }

      if (state.mode === 'failed') {
        return (
          <>
            <Dialog.Block>
              <Heading level={2}>{lang('wallet.verification_failed')}</Heading>
            </Dialog.Block>
            <Dialog.Block>
              <Panel variant='error' showIcon>
                {lang('wallet.verification_failed')}
              </Panel>
            </Dialog.Block>
            <Dialog.Block>
              <div className={classes.dialogButtons}>
                <Button onClick={onClose} variant='secondary'>
                  {lang('general.close')}
                </Button>
              </div>
            </Dialog.Block>
          </>
        );
      }

      if (state.mode === 'claimsSave') {
        return (
          <>
            <Dialog.Block>
              <Heading level={2}>{lang('wallet.data_received_title')}</Heading>
              <Paragraph>{lang('wallet.data_received_description')}</Paragraph>
            </Dialog.Block>
            <Dialog.Block>
              {state.fields.length > 0 ? (
                <DocumentDataPreview fields={state.fields} />
              ) : (
                <Paragraph>{lang('wallet.no_configured_fields')}</Paragraph>
              )}
            </Dialog.Block>
            <Dialog.Block>
              <div className={classes.dialogButtons}>
                <Button onClick={onSave} variant='primary'>
                  {lang('wallet.save_button')}
                </Button>
                <Button onClick={onClose} variant='secondary'>
                  {lang('general.cancel')}
                </Button>
              </div>
            </Dialog.Block>
          </>
        );
      }

      if (state.mode === 'claimsDownload') {
        return (
          <>
            <Dialog.Block>
              <Heading level={2}>{lang('wallet.data_received_title')}</Heading>
            </Dialog.Block>
            <Dialog.Block>
              <Panel variant='success' showIcon>
                {lang('wallet.data_received_description')}
              </Panel>
              <Heading level={3} data-size='sm'>
                {lang('wallet.received_claims_title')}
              </Heading>
              <List.Unordered className={classes.claimsList}>
                {Object.entries(state.claims).map(([key, value]) => (
                  <List.Item key={key}>
                    <strong>{key}:</strong> {JSON.stringify(value)}
                  </List.Item>
                ))}
              </List.Unordered>
            </Dialog.Block>
            <Dialog.Block>
              <div className={classes.dialogButtons}>
                <Button onClick={onDownloadXsd} variant='primary'>
                  {lang('wallet.download_xsd')}
                </Button>
                <Button onClick={onClose} variant='secondary'>
                  {lang('general.close')}
                </Button>
              </div>
            </Dialog.Block>
          </>
        );
      }

      if (state.mode === 'qr') {
        return (
          <>
            <Dialog.Block>
              <Heading level={2}>{lang('wallet.verification_title')}</Heading>
            </Dialog.Block>
            <Dialog.Block>
              <Paragraph>{lang('wallet.verification_description')}</Paragraph>
              <div className={classes.qrContainer}>
                <QRCodeSVG
                  value={state.authorizationUrl}
                  size={256}
                  height={256}
                  width={256}
                  level='M'
                  marginSize={4}
                  className={classes.qrCode}
                />
              </div>
              <div className={classes.linkContainer}>
                <Button
                  onClick={() => (window.location.href = state.authorizationUrl)}
                  variant='primary'
                >
                  {lang('wallet.open_wallet')}
                </Button>
              </div>
            </Dialog.Block>
            <Dialog.Block>
              <div className={classes.dialogButtons}>
                <Button onClick={onClose} variant='secondary'>
                  {lang('wallet.cancel_request')}
                </Button>
              </div>
            </Dialog.Block>
          </>
        );
      }

      return null;
    }

    return (
      <Dialog ref={ref} modal closedby='any'>
        {content}
      </Dialog>
    );
  },
);

WalletVerificationDialogLayout.displayName = 'WalletVerificationDialogLayout';
