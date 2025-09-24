import { useAttachmentsFor } from 'src/features/attachments/hooks';
import type { IAttachment } from 'src/features/attachments';

export function useUploaderSummaryData(baseComponentId: string): IAttachment[] {
  return useAttachmentsFor(baseComponentId);
}
