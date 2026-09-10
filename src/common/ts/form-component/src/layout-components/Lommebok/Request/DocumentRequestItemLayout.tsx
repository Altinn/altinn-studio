import { useRef } from 'react';
import type { Ref } from 'react';

import { Button } from '@app/form-component/app-components/Button';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { Details } from '@digdir/designsystemet-react';
import type { DisplayAttachment } from '@app/form-component/layout-components/AttachmentList';
import type { PresentationField } from '@app/form-component/layout-components/Lommebok/PresentationValue';

import { SavedDocumentFields } from './SavedDocumentFields';
import { WalletVerificationDialogLayout } from './WalletVerificationDialogLayout';
import type { WalletVerificationDialogState } from './WalletVerificationDialogLayout';

export interface DocumentRequestItemLayoutProps {
  documentDisplayName: string;
  claimTitles: string[];

  hasSaved: boolean;
  savedAttachments: DisplayAttachment[];
  savedFields: PresentationField[];
  onReset: () => void;
  resetPending: boolean;

  onRequestFromWallet: () => void;
  requestPending: boolean;

  showUploadAlternative: boolean;
  onFileSelected: (file: File) => void;
  uploadPending: boolean;

  dialogRef: Ref<HTMLDialogElement>;
  dialogState: WalletVerificationDialogState;
  onDialogConfirm: () => void;
  onDialogCancel: () => void;
  onDialogClose: () => void;
  onDialogSave: () => void;
  onDialogDownloadXsd: () => void;
}

export function DocumentRequestItemLayout({
  documentDisplayName,
  claimTitles,
  hasSaved,
  savedAttachments,
  savedFields,
  onReset,
  resetPending,
  onRequestFromWallet,
  requestPending,
  showUploadAlternative,
  onFileSelected,
  uploadPending,
  dialogRef,
  dialogState,
  onDialogConfirm,
  onDialogCancel,
  onDialogClose,
  onDialogSave,
  onDialogDownloadXsd,
}: DocumentRequestItemLayoutProps) {
  const { lang } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Details defaultOpen>
        <Details.Summary>{documentDisplayName}</Details.Summary>
        <Details.Content>
          {hasSaved ? (
            <>
              <SavedDocumentFields attachments={savedAttachments} fields={savedFields} />
              <div style={{ marginTop: '1rem' }}>
                <Button
                  onClick={onReset}
                  variant='secondary'
                  size='sm'
                  color='danger'
                  disabled={resetPending}
                >
                  {lang('wallet.remove_data')}
                </Button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                onClick={onRequestFromWallet}
                variant='primary'
                size='sm'
                disabled={requestPending}
              >
                {lang('wallet.request_document')}
              </Button>
              {showUploadAlternative && (
                <>
                  <span>{lang('general.or')}</span>
                  <Button
                    onClick={handleUploadClick}
                    variant='secondary'
                    size='sm'
                    disabled={uploadPending}
                  >
                    {lang('wallet.upload_document')}
                  </Button>
                </>
              )}
            </div>
          )}
        </Details.Content>
      </Details>

      <WalletVerificationDialogLayout
        ref={dialogRef}
        documentDisplayName={documentDisplayName}
        claimTitles={claimTitles}
        state={dialogState}
        onConfirm={onDialogConfirm}
        onCancel={onDialogCancel}
        onClose={onDialogClose}
        onSave={onDialogSave}
        onDownloadXsd={onDialogDownloadXsd}
      />

      {/* Hidden file input for PDF upload */}
      <input
        ref={fileInputRef}
        type='file'
        accept='application/pdf'
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );
}
