import { useCallback } from 'react';
import { toast } from 'react-toastify';

import { AttachmentMutations } from 'src/features/attachments/hooks/attachmentMutations';
import { FormStore } from 'src/features/form/FormContext';
import { useLanguage } from 'src/features/language/useLanguage';
import type { UploadedAttachment } from 'src/features/attachments';
import type { IDataModelBindingsList, IDataModelBindingsSimple } from 'src/layout/common.generated';

export interface AttachmentActionRemove {
  nodeId: string;
  attachment: UploadedAttachment;
  dataModelBindings: IDataModelBindingsSimple | IDataModelBindingsList | undefined;
}

export const AttachmentRemoval = {
  useAttachmentsRemover() {
    const { mutateAsync: removeAttachment } = AttachmentMutations.useAttachmentsRemoveMutation();
    const { lang } = useLanguage();
    const setLeafValue = FormStore.data.useSetLeafValue();
    const removeValueFromList = FormStore.data.useRemoveValueFromList();

    return useCallback(
      async ({ attachment, dataModelBindings, nodeId }: AttachmentActionRemove) => {
        try {
          await removeAttachment({ nodeId, dataElementId: attachment.data.id });
          if (dataModelBindings && 'list' in dataModelBindings) {
            removeValueFromList({ reference: dataModelBindings.list, value: attachment.data.id });
          } else if (dataModelBindings && 'simpleBinding' in dataModelBindings) {
            setLeafValue({ reference: dataModelBindings.simpleBinding, newValue: undefined });
          }
          return true;
        } catch {
          toast(lang('form_filler.file_uploader_validation_error_delete'), { type: 'error' });
          return false;
        }
      },
      [lang, removeAttachment, removeValueFromList, setLeafValue],
    );
  },
};
