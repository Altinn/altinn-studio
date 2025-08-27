import React from 'react';
import classes from './DeleteOptionsModal.module.css';
import { StudioDeleteButton } from 'libs/studio-components-legacy/src';
import { StudioParagraph } from 'libs/studio-components/src';
import { useTranslation } from 'react-i18next';

type DeleteOptionsProps = {
  onDeleteImageReferenceOnly: () => void;
  onDeleteImage: () => void;
};

export const DeleteOptions = ({
  onDeleteImageReferenceOnly,
  onDeleteImage,
}: DeleteOptionsProps) => {
  const { t } = useTranslation();
  return (
    <div className={classes.container}>
      <div>
        <StudioParagraph variant='long'>
          {t('ux_editor.properties_panel.images.delete_image_options_modal_content_only_ref')}
        </StudioParagraph>
        <StudioParagraph variant='long'>
          {t(
            'ux_editor.properties_panel.images.delete_image_options_modal_content_ref_and_from_library',
          )}
        </StudioParagraph>
      </div>
      <div className={classes.buttons}>
        <StudioDeleteButton onDelete={onDeleteImageReferenceOnly}>
          {t('ux_editor.properties_panel.images.delete_image_options_modal_button_only_ref')}
        </StudioDeleteButton>
        <StudioDeleteButton onDelete={onDeleteImage} variant='primary'>
          {t(
            'ux_editor.properties_panel.images.delete_image_options_modal_button_ref_and_from_library',
          )}
        </StudioDeleteButton>
      </div>
    </div>
  );
};
