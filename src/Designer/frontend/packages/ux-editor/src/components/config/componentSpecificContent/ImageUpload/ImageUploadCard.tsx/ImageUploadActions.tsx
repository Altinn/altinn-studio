import { StudioButton } from '@studio/components';
import type { Crop, ErrorProps } from '../ImageUploadTypes';
import { getCropToBeSaved, getDisabledState } from '../ImageUploadUtils';
import classes from './ImageUploadActions.module.css';
import { CheckmarkIcon, XMarkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';

type ImageUploadActionsProps = {
  tempCrop: Crop;
  initialCrop?: Crop;
  errors: ErrorProps;
  setOpenCard: (open: boolean) => void;
  handleSaveChanges: (tempCrop: Crop) => void;
};

export const ImageUploadActions = ({
  tempCrop,
  initialCrop,
  errors,
  setOpenCard,
  handleSaveChanges,
}: ImageUploadActionsProps) => {
  const { t } = useTranslation();
  const isDisabled = getDisabledState({ errors, tempCrop, initialCrop });

  const handleSave = () => {
    setOpenCard(false);
    handleSaveChanges(getCropToBeSaved(tempCrop));
  };

  const handleCancel = () => {
    setOpenCard(false);
  };

  return (
    <div className={classes.buttonGroup}>
      <StudioButton onClick={handleSave} icon={<CheckmarkIcon />} disabled={isDisabled}>
        {t('general.save')}
      </StudioButton>
      <StudioButton variant='secondary' icon={<XMarkIcon />} onClick={handleCancel}>
        {t('general.cancel')}
      </StudioButton>
    </div>
  );
};
