import { useMemo } from 'react';

import type { DisplayAttachment, PresentationField } from '@app/form-component';
import type { RequestedDocument } from '@app/layout-contract/generated/components/Lommebok/config.generated';

import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { FormStore } from 'src/features/form/FormContext';
import { useInstanceDataElements } from 'src/features/instance/InstanceContext';
import { getAttachmentsWithDataType, toDisplayAttachments, toRenderableAttachments } from 'src/utils/attachmentsUtils';

/**
 * Helper hook to check if a document has been saved (wallet data OR file upload)
 */
export function useDocumentSavedStatus(doc: RequestedDocument): boolean {
  const selector = FormStore.data.useDebouncedSelector();
  const uploadedElements = useInstanceDataElements(doc.alternativeUploadToDataType);

  return useMemo(() => {
    // Check if alternative file has been uploaded
    if (doc.alternativeUploadToDataType && uploadedElements.length > 0) {
      return true;
    }

    // Check if ANY configured field has data in the data model
    if (doc.saveToDataType && doc.data && doc.data.length > 0) {
      return doc.data.some((mapping) => {
        const value = selector({ dataType: doc.saveToDataType!, field: mapping.field });
        return value !== undefined && value !== null && value !== '';
      });
    }

    return false;
  }, [doc, uploadedElements, selector]);
}

export interface SavedDocumentFieldsData {
  attachments: DisplayAttachment[];
  fields: PresentationField[];
}

/**
 * Computes the render-ready data for the saved-document view: either the uploaded PDF file(s), or
 * the presentation fields extracted from the data model, whichever applies.
 */
export function useSavedDocumentFieldsData(doc: RequestedDocument): SavedDocumentFieldsData {
  const selector = FormStore.data.useDebouncedSelector();
  const uploadedElements = useInstanceDataElements(doc.alternativeUploadToDataType);
  const appMetadataDataTypes = getApplicationMetadata().dataTypes;

  return useMemo(() => {
    if (doc.alternativeUploadToDataType && uploadedElements.length > 0) {
      const attachmentsWithDataType = getAttachmentsWithDataType({
        attachments: uploadedElements,
        appMetadataDataTypes,
      });
      return {
        attachments: toRenderableAttachments(toDisplayAttachments(attachmentsWithDataType)),
        fields: [],
      };
    }

    if (!doc.data || doc.data.length === 0 || !doc.saveToDataType) {
      return { attachments: [], fields: [] };
    }

    const fields = doc.data
      .map((mapping) => {
        const value = selector({ dataType: doc.saveToDataType!, field: mapping.field });

        if (value === undefined || value === null || value === '') {
          return null;
        }

        return { title: mapping.title, value, displayType: mapping.displayType };
      })
      .filter((field): field is NonNullable<typeof field> => field !== null);

    return { attachments: [], fields };
  }, [doc, uploadedElements, appMetadataDataTypes, selector]);
}
