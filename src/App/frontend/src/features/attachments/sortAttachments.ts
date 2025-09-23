import type { IAttachment, IFailedAttachment } from 'src/features/attachments/index';

export function sortAttachmentsByName(a: IAttachment | IFailedAttachment, b: IAttachment | IFailedAttachment) {
  if (a.data.filename && b.data.filename) {
    return a.data.filename.localeCompare(b.data.filename);
  }
  return 0;
}
