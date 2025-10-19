import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';
import type { Crop, CircleComponent, ErrorProps } from '../ImageUploadTypes';
import { isRectangleComponent, SizeOptions } from '../ImageUploadUtils';
import { StudioTextfield } from '@studio/components';
import { useTranslation } from 'react-i18next';

type ImageUploadSizeProps = {
  tempCrop: Crop;
  errors: ErrorProps;
  handleNewCrop: (newCrop: Crop) => void;
};

export const ImageUploadSize = ({
  tempCrop,
  errors,
  handleNewCrop,
}: ImageUploadSizeProps): React.ReactElement => {
  const componentPropertyLabel = useComponentPropertyLabel();
  const { t } = useTranslation();

  const handleSizeChange = (key: SizeOptions) => (value?: number) => {
    const newCrop = { ...tempCrop, [key]: value };
    handleNewCrop(newCrop);
  };

  if (isRectangleComponent(tempCrop)) {
    return (
      <>
        <StudioTextfield
          label={componentPropertyLabel('crop_width')}
          value={tempCrop.width}
          type='number'
          onChange={(e) => handleSizeChange(SizeOptions.Width)(e.target.valueAsNumber)}
          error={t(errors.width)}
        />
        <StudioTextfield
          label={componentPropertyLabel('crop_height')}
          value={tempCrop.height}
          type='number'
          onChange={(e) => handleSizeChange(SizeOptions.Height)(e.target.valueAsNumber)}
          error={t(errors.height)}
        />
      </>
    );
  }

  const circle = tempCrop as CircleComponent;
  return (
    <StudioTextfield
      label={componentPropertyLabel('crop_diameter')}
      value={circle.diameter}
      type='number'
      onChange={(e) => handleSizeChange(SizeOptions.Diameter)(e.target.valueAsNumber)}
      error={t(errors.diameter)}
    />
  );
};
