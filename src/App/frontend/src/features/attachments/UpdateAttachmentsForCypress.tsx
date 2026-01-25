import { useEffect } from 'react';

import { useAllAttachments } from 'src/features/attachments/hooks';

export function UpdateAttachmentsForCypress() {
  const attachments = useAllAttachments();

  useEffect(() => {
    if (globalThis.Cypress) {
      globalThis.CypressState = { ...globalThis.CypressState, attachments };
    }
  }, [attachments]);

  return null;
}
