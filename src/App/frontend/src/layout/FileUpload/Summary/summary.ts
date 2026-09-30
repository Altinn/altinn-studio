import { AttachmentReadModel } from 'src/features/attachments/hooks/attachmentReadModel';
import type { IAttachment } from 'src/features/attachments';

export function useUploaderSummaryData(baseComponentId: string): IAttachment[] {
  return AttachmentReadModel.useAttachmentsFor(baseComponentId);
}
