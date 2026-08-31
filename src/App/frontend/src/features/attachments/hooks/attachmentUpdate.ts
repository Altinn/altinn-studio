import { useCallback } from 'react';
import { toast } from 'react-toastify';

import { AttachmentMutations } from 'src/features/attachments/hooks/attachmentMutations';
import { useOptimisticallyUpdateDataElement } from 'src/features/instance/InstanceContext';
import { useLanguage } from 'src/features/language/useLanguage';
import type { UploadedAttachment } from 'src/features/attachments';

export interface AttachmentActionUpdate {
  tags: string[];
  nodeId: string;
  attachment: UploadedAttachment;
}

export const AttachmentUpdate = {
  useAttachmentsUpdater() {
    const { mutateAsync: updateTags } = AttachmentMutations.useAttachmentUpdateTagsMutation();
    const optimisticallyUpdateDataElement = useOptimisticallyUpdateDataElement();
    const { lang } = useLanguage();

    return useCallback(
      async ({ tags, attachment, nodeId }: AttachmentActionUpdate) => {
        const tagsToAdd = tags.filter((tag) => !attachment.data.tags?.includes(tag));
        const tagsToRemove = attachment.data.tags?.filter((tag) => !tags.includes(tag)) ?? [];
        if ([...tagsToAdd].sort().join(',') === [...tagsToRemove].sort().join(',')) {
          return;
        }

        try {
          await updateTags({ nodeId, dataElementId: attachment.data.id, setTagsRequest: { tags } });
          optimisticallyUpdateDataElement(attachment.data.id, (dataElement) => ({ ...dataElement, tags }));
        } catch {
          toast(lang('form_filler.file_uploader_validation_error_update'), { type: 'error' });
        }
      },
      [lang, optimisticallyUpdateDataElement, updateTags],
    );
  },
};
