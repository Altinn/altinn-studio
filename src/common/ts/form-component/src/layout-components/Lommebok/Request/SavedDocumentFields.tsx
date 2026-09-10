import { Attachments } from '@app/form-component/layout-components/AttachmentList';
import { DocumentDataPreview } from '@app/form-component/layout-components/Lommebok/DocumentDataPreview';
import type { DisplayAttachment } from '@app/form-component/layout-components/AttachmentList';
import type { PresentationField } from '@app/form-component/layout-components/Lommebok/PresentationValue';

export interface SavedDocumentFieldsProps {
  /** Uploaded PDF file(s), shown instead of `fields` when a file was uploaded in place of wallet data. */
  attachments: DisplayAttachment[];
  /** Presentation fields extracted from the data model. */
  fields: PresentationField[];
}

/**
 * Displays what has been saved for a requested document: either the uploaded PDF file, or the
 * wallet data fields that were saved to the data model.
 */
export function SavedDocumentFields({ attachments, fields }: SavedDocumentFieldsProps) {
  if (attachments.length > 0) {
    return <Attachments attachments={attachments} />;
  }

  return <DocumentDataPreview fields={fields} />;
}
