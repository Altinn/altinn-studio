import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { DocumentRequestItemLayout } from '@app/form-component';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dot from 'dot-object';
import type { PresentationField, WalletVerificationDialogState } from '@app/form-component';
import type { RequestedDocument } from '@app/layout-contract/generated/components/Lommebok/config.generated';

import { useLanguage } from 'src/features/language/useLanguage';
import {
  getDocumentClaims,
  getDocumentDisplayName,
  startWalletVerification,
  walletQueries,
} from 'src/layout/Lommebok/api';
import { generateXsdFromWalletClaims } from 'src/layout/Lommebok/generateXsd';
import { useDocumentSavedStatus, useSavedDocumentFieldsData } from 'src/layout/Lommebok/useDocumentSavedStatus';
import {
  useResetDocumentData,
  useSaveLommebokData,
  useUploadLommebokPdfMutation,
} from 'src/layout/Lommebok/useLommebokMutations';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';

interface DocumentRequestItemProps {
  baseComponentId: string;
  doc: RequestedDocument;
}

export function DocumentRequestItem({ baseComponentId, doc }: DocumentRequestItemProps) {
  const { langAsString } = useLanguage();
  const queryClient = useQueryClient();
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const nodeId = `${useIndexedId(baseComponentId)}-${doc.type}`;

  const [pendingWalletRequest, setPendingWalletRequest] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [preservedClaims, setPreservedClaims] = useState<Record<string, unknown> | null>(null);
  const [preservedFailed, setPreservedFailed] = useState(false);

  const hasSaved = useDocumentSavedStatus(doc);
  const { attachments: savedAttachments, fields: savedFields } = useSavedDocumentFieldsData(doc);
  const saveLommebokData = useSaveLommebokData(doc.saveToDataType || 'default', doc.data);
  const uploadPdfMutation = useUploadLommebokPdfMutation(doc.alternativeUploadToDataType || 'default');
  const resetDocumentMutation = useResetDocumentData(doc, nodeId);

  const startMutation = useMutation({
    mutationKey: ['startWalletVerification', doc.type],
    mutationFn: () => startWalletVerification(doc.type),
    onSuccess: (data) => {
      setVerificationId(data.verifier_transaction_id);
      setAuthorizationUrl(data.authorization_request);
      setPendingWalletRequest(false);
    },
    onError: (error) => {
      window.logError('Failed to start wallet verification:', error);
      setPendingWalletRequest(false);
    },
  });

  const statusQuery = useQuery(walletQueries.status(verificationId));
  const resultQuery = useQuery({
    ...walletQueries.result(verificationId),
    enabled: statusQuery.data?.status === 'AVAILABLE' && !!verificationId,
  });

  const handleClearVerification = useCallback(() => {
    if (verificationId) {
      queryClient.removeQueries({ queryKey: walletQueries.statusKey(verificationId) });
      queryClient.removeQueries({ queryKey: walletQueries.resultKey(verificationId) });
      setVerificationId(null);
      // Keep authorizationUrl until the dialog is actually closed, since the dialog switches to
      // showing the claims/failure screen based on preservedClaims/preservedFailed instead.
    }
  }, [verificationId, queryClient]);

  // Preserve claims/failed status while the dialog is open, independent of the query lifecycle
  useEffect(() => {
    if (resultQuery.data?.claims) {
      setPreservedClaims(resultQuery.data.claims);
    }
  }, [resultQuery.data?.claims]);

  useEffect(() => {
    if (statusQuery.data?.status === 'FAILED') {
      setPreservedFailed(true);
    }
  }, [statusQuery.data?.status]);

  // Once verification is complete (success or failure), stop polling by clearing the id
  useEffect(() => {
    const status = statusQuery.data?.status;
    if (status && status !== 'PENDING' && (resultQuery.data || status === 'FAILED')) {
      handleClearVerification();
    }
  }, [statusQuery.data?.status, resultQuery.data, handleClearVerification]);

  const handleRequestFromWallet = () => {
    setPendingWalletRequest(true);
    confirmDialogRef.current?.showModal();
  };

  const handleConfirmRequest = () => {
    startMutation.mutate();
  };

  const handleCancelRequest = () => {
    setPendingWalletRequest(false);
    confirmDialogRef.current?.close();
  };

  const handleCloseVerification = () => {
    handleClearVerification();
    setVerificationId(null);
    setAuthorizationUrl(null);
    setPreservedClaims(null);
    setPreservedFailed(false);
    confirmDialogRef.current?.close();
  };

  const handleSaveData = () => {
    if (preservedClaims) {
      saveLommebokData(preservedClaims);
      handleCloseVerification();
    }
  };

  const handleDownloadXsd = () => {
    if (!preservedClaims) {
      return;
    }

    const xsd = generateXsdFromWalletClaims(preservedClaims, doc.type);
    const blob = new Blob([xsd], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.type.replace(/-/g, '')}.xsd`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileSelected = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast(langAsString('wallet.pdf_only'), { type: 'error' });
      return;
    }
    await uploadPdfMutation.mutateAsync(file);
  };

  const claimTitles =
    doc.data && doc.data.length > 0
      ? doc.data.map((field) => langAsString(field.title))
      : getDocumentClaims(doc.type).map((claim) => claim.name);

  const presentationFields: PresentationField[] =
    doc.data
      ?.map((mapping) => {
        const value = preservedClaims ? dot.pick(mapping.field, preservedClaims) : undefined;
        if (value === undefined || value === null) {
          return null;
        }
        return { title: mapping.title, value, displayType: mapping.displayType };
      })
      .filter((field): field is NonNullable<typeof field> => field !== null) ?? [];

  const dialogState: WalletVerificationDialogState = pendingWalletRequest
    ? { mode: 'confirm' }
    : preservedFailed
      ? { mode: 'failed' }
      : preservedClaims && doc.saveToDataType
        ? { mode: 'claimsSave', fields: presentationFields }
        : preservedClaims && !doc.saveToDataType
          ? { mode: 'claimsDownload', claims: preservedClaims }
          : authorizationUrl
            ? { mode: 'qr', authorizationUrl }
            : { mode: 'hidden' };

  return (
    <DocumentRequestItemLayout
      documentDisplayName={getDocumentDisplayName(doc.type)}
      claimTitles={claimTitles}
      hasSaved={hasSaved}
      savedAttachments={savedAttachments}
      savedFields={savedFields}
      onReset={() => resetDocumentMutation.mutate()}
      resetPending={resetDocumentMutation.isPending}
      onRequestFromWallet={handleRequestFromWallet}
      requestPending={startMutation.isPending}
      showUploadAlternative={!!doc.alternativeUploadToDataType}
      onFileSelected={handleFileSelected}
      uploadPending={uploadPdfMutation.isPending}
      dialogRef={confirmDialogRef}
      dialogState={dialogState}
      onDialogConfirm={handleConfirmRequest}
      onDialogCancel={handleCancelRequest}
      onDialogClose={handleCloseVerification}
      onDialogSave={handleSaveData}
      onDialogDownloadXsd={handleDownloadXsd}
    />
  );
}
