import { StudioButton } from '@studio/components';
import type { ExternalCrop, InternalCrop, ErrorProps } from '../ImageUploadTypes';
import { getCropToBeSaved, getDisabledState } from '../ImageUploadUtils';
import classes from './ImageUploadActions.module.css';
import { CheckmarkIcon, XMarkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';

type ImageUploadActionsProps = {
  internalCrop: InternalCrop;
  externalCrop?: ExternalCrop;
  errors: ErrorProps;
  setOpenCard: (open: boolean) => void;
  handleSaveChanges: (cropToBeSaved: ExternalCrop) => void;
};

export const ImageUploadActions = ({
  internalCrop,
  externalCrop,
  errors,
  setOpenCard,
  handleSaveChanges,
}: ImageUploadActionsProps) => {
  const { t } = useTranslation();
  const isDisabled = getDisabledState({ errors, internalCrop, externalCrop });

  const handleSave = () => {
    setOpenCard(false);
    handleSaveChanges(getCropToBeSaved(internalCrop));
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
