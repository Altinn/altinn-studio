import { useEffect } from 'react';

import { useAllAttachments } from 'src/features/attachments/hooks';

export function UpdateAttachmentsForCypress() {
  const attachments = useAllAttachments();

  useEffect(() => {
    if (window.Cypress) {
      window.CypressState = { ...window.CypressState, attachments };
    }
  }, [attachments]);

  return null;
}
