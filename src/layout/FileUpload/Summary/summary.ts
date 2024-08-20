import { useAttachmentsFor } from 'src/features/attachments/hooks';
import type { IAttachment } from 'src/features/attachments';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function useUploaderSummaryData(node: LayoutNode<'FileUpload' | 'FileUploadWithTag'>): IAttachment[] {
  return useAttachmentsFor(node);
}
