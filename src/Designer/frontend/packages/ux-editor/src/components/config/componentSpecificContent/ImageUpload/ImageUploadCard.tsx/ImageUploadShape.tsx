import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';
import { StudioSelect } from '@studio/components';
import type { Crop, ShapeOptions } from '../ImageUploadTypes';

type ImageUploadShapeProps = {
  tempCrop: Crop;
  handleNewCrop: (newCrop: Crop) => void;
};

export const ImageUploadShape = ({
  tempCrop,
  handleNewCrop,
}: ImageUploadShapeProps): React.ReactElement => {
  const componentPropertyLabel = useComponentPropertyLabel();
  const shapeOptions: ShapeOptions[] = ['circle', 'rectangle'];

  const handleShapeChange = (newShape: ShapeOptions) => {
    const newCrop = { ...tempCrop, shape: newShape };
    handleNewCrop(newCrop);
  };

  return (
    <StudioSelect
      label={componentPropertyLabel('Bildeform')}
      value={tempCrop.shape}
      onChange={(event) => {
        handleShapeChange(event.target.value as ShapeOptions);
      }}
    >
      {shapeOptions.map((option) => (
        <StudioSelect.Option key={option} value={option}>
          {componentPropertyLabel(`crop_${option}`)}
        </StudioSelect.Option>
      ))}
    </StudioSelect>
  );
};
