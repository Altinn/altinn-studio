import type { IAttachment, IAttachments } from 'src/features/attachments/index';

export function mergeAndSort(...args: IAttachments[]) {
  const result: IAttachments = {};
  for (const map of args) {
    for (const nodeId of Object.keys(map)) {
      const next = map[nodeId];
      const existing = result[nodeId];
      if (existing && next) {
        existing.push(...next);
      } else if (!existing && next) {
        result[nodeId] = [...next];
      }
    }
  }

  // Sort all attachments by name
  for (const nodeId in Object.keys(result)) {
    const attachments = result[nodeId];
    if (attachments) {
      attachments.sort(sortAttachmentsByName);
    }
  }

  return result;
}

export function sortAttachmentsByName(a: IAttachment, b: IAttachment) {
  if (a.data.filename && b.data.filename) {
    return a.data.filename.localeCompare(b.data.filename);
  }
  return 0;
}
