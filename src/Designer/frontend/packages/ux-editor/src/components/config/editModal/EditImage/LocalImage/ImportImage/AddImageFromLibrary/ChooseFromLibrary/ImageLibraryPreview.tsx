import React from 'react';
import classes from './ChooseFromLibrary.module.css';
import { imagePath } from 'app-shared/api/paths';
import { FileNameUtils } from '@studio/pure-functions';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { WWWROOT_FILE_PATH } from '../../../../../EditImage/constants';
import { StudioCard } from '@studio/components-legacy';
import { StudioHeading } from '@studio/components';

type ImageLibraryPreviewProps = {
  imagesFileNames: string[];
  onAddImageReference: (imageFilePath: string) => void;
};

export const ImageLibraryPreview = ({
  imagesFileNames,
  onAddImageReference,
}: ImageLibraryPreviewProps) => {
  const { org, app } = useStudioEnvironmentParams();

  return (
    <div className={classes.cardsContainer}>
      {imagesFileNames.map((imageFilePath) => (
        <ImageFromLibrary
          key={imageFilePath}
          imageFilePath={imageFilePath}
          onAddImageReference={onAddImageReference}
          imageSource={imagePath(org, app, imageFilePath)}
        />
      ))}
    </div>
  );
};

interface ImageFromLibraryProps {
  imageFilePath: string;
  onAddImageReference: (imageFilePath: string) => void;
  imageSource: string;
}

const ImageFromLibrary = ({
  imageFilePath,
  onAddImageReference,
  imageSource,
}: ImageFromLibraryProps) => {
  const fileName = FileNameUtils.extractFileName(imageFilePath);
  // The img component requires an alt which we can set to be the descriptions from the metadata in the library when this is available.
  // TODO: Add description when we know how to store them. See analysis issue: https://github.com/Altinn/altinn-studio/issues/13346
  return (
    <div className={classes.card}>
      <StudioCard onClick={() => onAddImageReference(`${WWWROOT_FILE_PATH}${imageFilePath}`)}>
        <StudioCard.Media>
          <img src={imageSource} alt={imageFilePath} />
        </StudioCard.Media>
        <StudioCard.Header>
          <StudioHeading className={classes.fileName} title={fileName}>
            {fileName}
          </StudioHeading>
        </StudioCard.Header>
      </StudioCard>
    </div>
  );
};
