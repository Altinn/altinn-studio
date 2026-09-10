import { toast } from 'react-toastify';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import dot from 'dot-object';
import type { RequestedDocument } from '@app/layout-contract/generated/components/Lommebok/config.generated';

import { AttachmentMutations } from 'src/features/attachments/hooks/attachmentMutations';
import { FormStore } from 'src/features/form/FormContext';
import {
  useInstanceDataElements,
  useInvalidateInstanceDataCache,
  useOptimisticallyAppendDataElements,
  useStrictInstanceId,
} from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { doLommebokPdfUpload, walletQueries } from 'src/layout/Lommebok/api';
import type { FDLeafValue } from 'src/features/formData/FormDataWrite';
import type { VerificationResultResponse } from 'src/layout/Lommebok/api';

/**
 * Helper function to extract a value from nested claims object using dot notation
 */
const getNestedClaimValue = (claims: Record<string, unknown>, path: string): FDLeafValue | undefined => {
  const value = dot.pick(path, claims);

  // Handle various value types
  if (value === null || value === undefined) {
    return undefined;
  }

  // FDLeafValue accepts string, number, boolean, or null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  // Convert objects/arrays to JSON strings as fallback
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return undefined;
};

/**
 * Hook for saving lommebok wallet verification data to a data model using FormData hooks.
 * Supports configurable field mappings via the 'data' property.
 */
export const useSaveLommebokData = (dataType: string, dataConfig?: RequestedDocument['data']) => {
  const { langAsString } = useLanguage();
  const setMultiLeafValues = FormStore.data.useSetMultiLeafValues();

  return (claims: VerificationResultResponse['claims']) => {
    let changes: Array<{ reference: { dataType: string; field: string }; newValue: FDLeafValue }>;

    if (dataConfig && dataConfig.length > 0) {
      // Configured field mappings: extract only the claims the service owner asked for.
      changes = dataConfig
        .map((mapping) => {
          const value = getNestedClaimValue(claims, mapping.field);

          if (value === undefined) {
            window.logWarnOnce(`[Lommebok] No value found for claim path: ${mapping.field}`);
            return null;
          }

          return {
            reference: { dataType, field: mapping.field },
            newValue: value,
          };
        })
        .filter((change): change is NonNullable<typeof change> => change !== null);
    } else {
      // No field mapping configured: fall back to flattening every claim into the data model.
      const flattenedClaims = dot.dot(claims);
      changes = Object.entries(flattenedClaims).map(([field, value]) => ({
        reference: { dataType, field },
        newValue: value as FDLeafValue,
      }));
    }

    if (changes.length === 0) {
      window.logWarn('[Lommebok] No claims to save - check your data configuration');
      toast(langAsString('wallet.no_data_to_save'), { type: 'warning' });
      return;
    }

    setMultiLeafValues({ changes });
    toast(langAsString('wallet.upload_success'), { type: 'success' });
  };
};

/**
 * Hook for uploading a PDF file as an alternative to wallet verification
 */
export const useUploadLommebokPdfMutation = (dataType: string) => {
  const instanceId = useStrictInstanceId();
  const { langAsString } = useLanguage();
  const language = useCurrentLanguage();
  const invalidateInstanceData = useInvalidateInstanceDataCache();
  const optimisticallyAppendDataElements = useOptimisticallyAppendDataElements();

  return useMutation({
    mutationKey: ['uploadLommebokPdf', dataType],
    mutationFn: async (file: File) => await doLommebokPdfUpload(instanceId, dataType, language, file),
    onSuccess: (data) => {
      optimisticallyAppendDataElements([data]);
      invalidateInstanceData();
      toast(langAsString('wallet.pdf_upload_success'), { type: 'success' });
    },
    onError: (error) => {
      window.logErrorOnce('Failed to upload lommebok PDF:', error);

      if (isAxiosError(error) && error.response?.status === 409) {
        toast(langAsString('wallet.pdf_upload_conflict'), { type: 'error' });
      } else {
        toast(langAsString('wallet.pdf_upload_failed'), { type: 'error' });
      }

      // Re-throw so the component can handle it
      throw error;
    },
  });
};

/**
 * Hook for resetting/removing saved document data.
 * Handles both wallet data (form data) and uploaded PDF files.
 */
export const useResetDocumentData = (doc: RequestedDocument, nodeId: string) => {
  const setMultiLeafValues = FormStore.data.useSetMultiLeafValues();
  const { mutateAsync: removeAttachment } = AttachmentMutations.useAttachmentsRemoveMutation();
  const uploadedElements = useInstanceDataElements(doc.alternativeUploadToDataType);
  const invalidateInstanceData = useInvalidateInstanceDataCache();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['resetLommebokDocument', doc.type, doc.saveToDataType, doc.alternativeUploadToDataType],
    mutationFn: async () => {
      // 1. Clear wallet data from form data model if configured
      if (doc.saveToDataType && doc.data && doc.data.length > 0) {
        const changes = doc.data.map((mapping) => ({
          reference: { dataType: doc.saveToDataType!, field: mapping.field },
          newValue: undefined as FDLeafValue,
        }));
        setMultiLeafValues({ changes });
      }

      // 2. Delete uploaded PDF files if any exist
      if (doc.alternativeUploadToDataType && uploadedElements.length > 0) {
        for (const element of uploadedElements) {
          await removeAttachment({ nodeId, dataElementId: element.id });
        }
      }

      // 3. Clear all wallet verification query cache (full reset)
      queryClient.removeQueries({ queryKey: walletQueries.all() });

      // 4. Invalidate instance data to refresh UI
      await invalidateInstanceData();
    },
    onError: (error) => {
      window.logError('Failed to reset lommebok document data:', error);
    },
  });
};
