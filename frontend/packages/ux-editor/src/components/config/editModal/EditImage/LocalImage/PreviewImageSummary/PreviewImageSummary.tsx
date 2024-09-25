import React from 'react';
import { ImageIcon } from '@studio/icons';
import { StudioDeleteButton } from '@studio/components';
import classes from './PreviewImageSummary.module.css';
import { useTranslation } from 'react-i18next';
import { DeleteOptionsModal } from './DeleteOptionsModal/DeleteOptionsModal';
import { PreviewFileInfo } from '@altinn/ux-editor/components/config/editModal/EditImage/LocalImage/PreviewImageSummary/PreviewFileInfo';

export interface PreviewImageSummaryProps {
  existingImageUrl: string;
  existingImageDescription: string;
  onDeleteImage: (fileName: string) => void;
  onDeleteImageReferenceOnly: () => void;
}

export const PreviewImageSummary = ({
  existingImageUrl,
  existingImageDescription,
  onDeleteImage,
  onDeleteImageReferenceOnly,
}: PreviewImageSummaryProps) => {
  const { t } = useTranslation();
  const deleteOptionsDialogRef = React.useRef<HTMLDialogElement>(null);

  const openDeleteOptionsDialog = () => {
    deleteOptionsDialogRef.current?.showModal();
  };

  return (
    <div className={classes.previewContainer}>
      <ImageIcon className={classes.fileIcon} />
      <PreviewFileInfo
        existingImageUrl={existingImageUrl}
        existingImageDescription={existingImageDescription}
      />
      <StudioDeleteButton
        title={t('ux_editor.properties_panel.images.delete_image_reference_title')}
        variant='tertiary'
        size='small'
        onDelete={openDeleteOptionsDialog}
      />
      <DeleteOptionsModal
        onDeleteImage={() => onDeleteImage(existingImageUrl)}
        onDeleteImageReferenceOnly={onDeleteImageReferenceOnly}
        ref={deleteOptionsDialogRef}
      />
    </div>
  );
};
