import type { Ref } from 'react';

import { Button } from '@app/form-component/app-components/Button';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { Details } from '@digdir/designsystemet-react';

import { WalletIssuanceDialogLayout } from './WalletIssuanceDialogLayout';

export interface IssueDocumentItemLayoutProps {
  documentDisplayName: string;
  hasValidUrl: boolean;
  credentialUrl: string;
  onIssueToWallet: () => void;
  dialogRef: Ref<HTMLDialogElement>;
  onDialogClose: () => void;
}

export function IssueDocumentItemLayout({
  documentDisplayName,
  hasValidUrl,
  credentialUrl,
  onIssueToWallet,
  dialogRef,
  onDialogClose,
}: IssueDocumentItemLayoutProps) {
  const { lang } = useTranslation();

  return (
    <>
      <Details defaultOpen>
        <Details.Summary>{documentDisplayName}</Details.Summary>
        <Details.Content>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {!hasValidUrl && (
              <div
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#FEF3CD',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                }}
              >
                {lang('wallet.issue_no_url')}
              </div>
            )}
            <div>
              <Button onClick={onIssueToWallet} variant='primary' size='sm' disabled={!hasValidUrl}>
                {lang('wallet.issue_to_wallet')}
              </Button>
            </div>
          </div>
        </Details.Content>
      </Details>

      <WalletIssuanceDialogLayout
        ref={dialogRef}
        documentDisplayName={documentDisplayName}
        credentialUrl={credentialUrl}
        onClose={onDialogClose}
      />
    </>
  );
}
