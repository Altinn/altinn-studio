import classes from './ConflictingImageSourceAlert.module.css';
import { StudioAlert } from '@studio/components';
import { useTranslation } from 'react-i18next';

interface ConflictingImageSourceAlertProps {
  showAlert: boolean;
  conflictSource: 'external' | 'relative';
}

export const ConflictingImageSourceAlert = ({
  showAlert,
  conflictSource,
}: ConflictingImageSourceAlertProps) => {
  const { t } = useTranslation();

  return (
    showAlert && (
      <StudioAlert data-size='sm' className={classes.alert}>
        {conflictSource === 'external'
          ? t('ux_editor.properties_panel.images.conflicting_image_source_when_entering_url')
          : t('ux_editor.properties_panel.images.conflicting_image_source_when_uploading_image')}
      </StudioAlert>
    )
  );
};
