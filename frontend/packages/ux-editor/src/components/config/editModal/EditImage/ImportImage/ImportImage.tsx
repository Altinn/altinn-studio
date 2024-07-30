import type { FormEvent } from 'react';
import React, { useRef, useState } from 'react';
import { StudioButton } from '@studio/components';
import { UploadIcon } from '@studio/icons';
import classes from './ImportImage.module.css';
import { useAddImageMutation } from 'app-shared/hooks/mutations/useAddImageMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { AddImageFromLibrary } from '@altinn/ux-editor/components/config/editModal/EditImage/ImportImage/AddImageFromLibrary/AddImageFromLibrary';

interface ImportImageProps {
  onImageChange: (imageSource: string) => void;
}

export const ImportImage = ({ onImageChange }: ImportImageProps) => {
  const [showChooseFromLibraryModalOpen, setShowChooseFromLibraryModalOpen] = useState(false);
  const imageRef = useRef(null);
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: uploadImage } = useAddImageMutation(org, app);

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const imageFile = imageRef?.current?.files?.item(0);

    if (imageFile) {
      const formData = new FormData();
      formData.append('image', imageFile);
      uploadImage(formData);
      onImageChange(imageFile.name);
    }
  };

  const handleInputChange = () => {
    const file = imageRef?.current?.files?.item(0);
    if (file) handleSubmit();
  };

  return (
    <div className={classes.importImage}>
      <StudioButton size='small' onClick={() => setShowChooseFromLibraryModalOpen(true)}>
        {'Velg fra biblioteket'}
      </StudioButton>
      {showChooseFromLibraryModalOpen && (
        <AddImageFromLibrary
          isOpen={showChooseFromLibraryModalOpen}
          onClose={() => setShowChooseFromLibraryModalOpen(false)}
        />
      )}
      <form onSubmit={handleSubmit}>
        <input
          type='file'
          className='sr-only'
          accept='image/*'
          ref={imageRef}
          onChange={handleInputChange}
          alt=''
        />
        <StudioButton
          size='small'
          onClick={() => imageRef?.current?.click()}
          variant='tertiary'
          icon={<UploadIcon />}
        >
          {'Last opp eget bilde'}
        </StudioButton>
      </form>
    </div>
  );
};
