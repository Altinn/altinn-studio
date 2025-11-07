import { useEffect, useRef } from 'react';
import type React from 'react';

import type { UploadedAttachment } from 'src/features/attachments';

export function useFocusWhenUploaded(
  attachment: UploadedAttachment | undefined,
  elementRef: React.RefObject<HTMLElement | null>,
) {
  const prevAttachmentIdRef = useRef<string | undefined>(undefined);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    const handleInitialMount = () => {
      isInitialMountRef.current = false;
      if (isAttachmentUploaded(attachment)) {
        prevAttachmentIdRef.current = getAttachmentId(attachment);
      }
    };

    const handleAttachmentUpload = () => {
      const currentId = getAttachmentId(attachment);
      const previousId = prevAttachmentIdRef.current;
      const attachmentIdChanged = hasAttachmentIdChanged(currentId, previousId);
      const isUploaded = isAttachmentUploaded(attachment);

      if (attachmentIdChanged && isUploaded) {
        focusElement(elementRef);
        prevAttachmentIdRef.current = currentId;
      }
    };

    if (isInitialMountRef.current) {
      handleInitialMount();
      return;
    }

    handleAttachmentUpload();
  }, [attachment, elementRef]);
}

function isAttachmentUploaded(attachment: UploadedAttachment | undefined): attachment is UploadedAttachment {
  return !!attachment?.uploaded;
}

function getAttachmentId(attachment: UploadedAttachment | undefined): string | undefined {
  return attachment?.data.id;
}

function hasAttachmentIdChanged(currentId: string | undefined, previousId: string | undefined): boolean {
  return !!currentId && currentId !== previousId;
}

function focusElement(elementRef: React.RefObject<HTMLElement | null>): void {
  requestAnimationFrame(() => {
    elementRef.current?.focus();
  });
}
