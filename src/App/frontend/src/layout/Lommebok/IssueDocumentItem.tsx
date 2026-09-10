import React, { useRef } from 'react';

import { IssueDocumentItemLayout } from '@app/form-component';
import type { IssuableDocument } from '@app/layout-contract/generated/components/Lommebok/config.generated';

import { FormStore } from 'src/features/form/FormContext';
import { useCurrentUiFolderNameFromUrl } from 'src/features/form/ui/hooks';
import { getDefaultDataTypeFromUiFolder } from 'src/features/form/ui/index';
import { getDocumentDisplayName } from 'src/layout/Lommebok/api';

interface IssueDocumentItemProps {
  doc: IssuableDocument;
}

export function IssueDocumentItem({ doc }: IssueDocumentItemProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const uiFolder = useCurrentUiFolderNameFromUrl();
  const defaultDataType = getDefaultDataTypeFromUiFolder(uiFolder);
  const dataType = doc.urlDataType || defaultDataType || 'default';

  const selector = FormStore.data.useDebouncedSelector();
  const credentialUrl = selector({ dataType, field: doc.urlField });

  const hasValidUrl = typeof credentialUrl === 'string' && credentialUrl.trim().length > 0;

  return (
    <IssueDocumentItemLayout
      documentDisplayName={getDocumentDisplayName(doc.type)}
      hasValidUrl={hasValidUrl}
      credentialUrl={hasValidUrl ? (credentialUrl as string) : ''}
      onIssueToWallet={() => {
        if (hasValidUrl) {
          dialogRef.current?.showModal();
        }
      }}
      dialogRef={dialogRef}
      onDialogClose={() => dialogRef.current?.close()}
    />
  );
}
