import React from 'react';
import classes from './ExternalImageValidationStatus.module.css';
import { StudioSpinner } from 'libs/studio-components-legacy/src';
import { StudioParagraph } from 'libs/studio-components/src';
import { useTranslation } from 'react-i18next';
import type { ExternalImageUrlValidationResponse } from 'app-shared/types/api/ExternalImageUrlValidationResponse';

interface ExternalImageValidationStatusProps {
  validationStatus: string;
  validationResult: ExternalImageUrlValidationResponse;
}

export const ExternalImageValidationStatus = ({
  validationStatus,
  validationResult,
}: ExternalImageValidationStatusProps) => {
  const { t } = useTranslation();

  const validationMessage = useValidationMessageBasedOnValidationStatus(validationResult);

  switch (validationStatus) {
    case 'pending':
      return (
        <StudioSpinner
          size='small'
          showSpinnerTitle
          spinnerTitle={t('ux_editor.properties_panel.images.validating_image_url_pending')}
        />
      );
    case 'error':
      return (
        <StudioParagraph className={classes.validationStatusContainer}>
          {t('ux_editor.properties_panel.images.validating_image_url_error')}
        </StudioParagraph>
      );
    case 'success':
      return validationMessage === '' ? null : (
        <StudioParagraph className={classes.validationStatusContainer}>
          {validationMessage}
        </StudioParagraph>
      );
  }
};

export const useValidationMessageBasedOnValidationStatus = (
  validationResultStatus: ExternalImageUrlValidationResponse,
): string => {
  const { t } = useTranslation();

  switch (validationResultStatus) {
    case 'Ok':
      return '';
    case 'NotValidUrl':
      return t('ux_editor.properties_panel.images.invalid_external_url');
    case 'NotAnImage':
      return t('ux_editor.properties_panel.images.invalid_external_url_not_an_image');
  }
};
