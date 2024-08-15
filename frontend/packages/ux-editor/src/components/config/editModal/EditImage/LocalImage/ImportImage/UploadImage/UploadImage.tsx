import React from 'react';
import { UploadIcon } from '@studio/icons';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';

export interface UploadImageProps {
  onHandleSubmit: () => void;
  onHandleInputChange: () => void;
  imageRef: React.MutableRefObject<any>;
}
export const UploadImage = ({
  onHandleSubmit,
  onHandleInputChange,
  imageRef,
}: UploadImageProps) => {
  const { t } = useTranslation();
  return (
    <form onSubmit={onHandleSubmit}>
      <input
        type='file'
        className='sr-only'
        accept='image/*'
        ref={imageRef}
        onChange={onHandleInputChange}
      />
      <StudioButton
        size='small'
        onClick={() => imageRef?.current?.click()}
        variant='tertiary'
        icon={<UploadIcon />}
      >
        {t('ux_editor.properties_panel.images.upload_image')}
      </StudioButton>
    </form>
  );
};
