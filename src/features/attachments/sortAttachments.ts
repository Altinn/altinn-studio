import type { IAttachment } from 'src/features/attachments/index';

export function sortAttachmentsByName(a: IAttachment, b: IAttachment) {
  if (a.data.filename && b.data.filename) {
    return a.data.filename.localeCompare(b.data.filename);
  }
  return 0;
}
