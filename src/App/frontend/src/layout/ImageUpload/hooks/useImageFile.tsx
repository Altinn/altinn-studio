import { type UploadedAttachment } from 'src/features/attachments';
import { AttachmentReadModel } from 'src/features/attachments/hooks/attachmentReadModel';
import { AttachmentRemoval } from 'src/features/attachments/hooks/attachmentRemoval';
import { AttachmentUpload } from 'src/features/attachments/hooks/attachmentUpload';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import { getDataElementUrl } from 'src/utils/urls/appUrlHelper';
import { makeUrlRelativeIfSameDomain } from 'src/utils/urls/urlHelper';

type UseImageFileResult = {
  storedImage?: UploadedAttachment;
  imageUrl?: string;
  saveImage: (file: File) => void;
  deleteImage: () => void;
};

export const useImageFile = (baseComponentId: string): UseImageFileResult => {
  const { dataModelBindings } = useItemWhenType(baseComponentId, 'ImageUpload');
  const indexedId = useIndexedId(baseComponentId);
  const uploadImage = AttachmentUpload.useAttachmentsUploader();
  const removeImage = AttachmentRemoval.useAttachmentsRemover();
  const storedImage = AttachmentReadModel.useAttachmentsFor(baseComponentId)[0] as UploadedAttachment | undefined;

  const language = useCurrentLanguage();
  const instanceId = useLaxInstanceId();
  const imageUrl =
    storedImage &&
    instanceId &&
    makeUrlRelativeIfSameDomain(getDataElementUrl(instanceId, storedImage.data.id, language));

  const saveImage = (file: File) => {
    uploadImage({
      files: [file],
      nodeId: indexedId,
      dataModelBindings,
    });
  };

  const deleteImage = () => {
    if (storedImage?.deleting || !storedImage) {
      return;
    }

    removeImage({
      attachment: storedImage,
      nodeId: indexedId,
      dataModelBindings,
    });
  };

  return { storedImage, imageUrl, saveImage, deleteImage };
};
