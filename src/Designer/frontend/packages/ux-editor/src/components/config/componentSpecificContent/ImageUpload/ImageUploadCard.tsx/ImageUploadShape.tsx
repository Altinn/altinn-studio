import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';
import { StudioSelect } from '@studio/components';
import type { InternalCrop, ShapeOptions } from '../ImageUploadTypes';

type ImageUploadShapeProps = {
  internalCrop: InternalCrop;
  handleNewCrop: (newCrop: InternalCrop) => void;
};

export const ImageUploadShape = ({
  internalCrop,
  handleNewCrop,
}: ImageUploadShapeProps): React.ReactElement => {
  const componentPropertyLabel = useComponentPropertyLabel();
  const shapeOptions: ShapeOptions[] = ['circle', 'rectangle'];

  const handleShapeChange = (newShape: ShapeOptions) => {
    const newCrop = { ...internalCrop, shape: newShape };
    handleNewCrop(newCrop);
  };

  return (
    <StudioSelect
      label={componentPropertyLabel('Bildeform')}
      value={internalCrop.shape}
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
