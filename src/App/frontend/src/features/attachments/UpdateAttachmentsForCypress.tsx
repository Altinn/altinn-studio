import { useEffect } from 'react';

import { AttachmentReadModel } from 'src/features/attachments';

export function UpdateAttachmentsForCypress() {
  const attachments = AttachmentReadModel.useAllAttachments();

  useEffect(() => {
    if (window.Cypress) {
      window.CypressState = { ...window.CypressState, attachments };
    }
  }, [attachments]);

  return null;
}
