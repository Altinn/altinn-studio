import React, { useState } from 'react';
import { ImageIcon } from '@studio/icons';
import { StudioDeleteButton, StudioParagraph } from '@studio/components';
import classes from './PreviewImageSummary.module.css';
import { useTranslation } from 'react-i18next';
import { DeleteOptionsModal } from './DeleteOptionsModal/DeleteOptionsModal';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

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
  const [deleteOptionsModalOpen, setDeleteOptionModalOpen] = useState<boolean>(false);

  return (
    <div className={classes.previewContainer}>
      <ImageIcon className={classes.fileIcon} />
      <div className={classes.fileInfoContainer}>
        <StudioParagraph size='small' className={classes.fileName}>
          {existingImageUrl}
        </StudioParagraph>
        {existingImageDescription ? (
          <StudioParagraph size='small' className={classes.fileDescription}>
            {existingImageDescription}
          </StudioParagraph>
        ) : (
          <StudioParagraph size='small' className={classes.missingFileDescription}>
            {t('ux_editor.properties_panel.images.description_missing')}
          </StudioParagraph>
        )}
      </div>
      <StudioDeleteButton
        title={t('ux_editor.properties_panel.images.delete_image_reference_title')}
        variant='tertiary'
        size='small'
        onDelete={
          shouldDisplayFeature('useImageLibrary')
            ? () => setDeleteOptionModalOpen(true)
            : () => onDeleteImage(existingImageUrl)
        }
      />
      {deleteOptionsModalOpen && (
        <DeleteOptionsModal
          isOpen={deleteOptionsModalOpen}
          onClose={() => setDeleteOptionModalOpen(false)}
          onDeleteImage={() => onDeleteImage(existingImageUrl)}
          onDeleteImageReferenceOnly={onDeleteImageReferenceOnly}
        />
      )}
    </div>
  );
};
