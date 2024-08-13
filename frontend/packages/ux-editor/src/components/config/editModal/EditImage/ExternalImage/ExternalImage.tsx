import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
import { LinkIcon } from '@studio/icons';
import { StudioParagraph, StudioSpinner, StudioToggleableTextfield } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './ExternalImage.module.css';
import { useValidateImageExternalUrlQuery } from 'app-shared/hooks/queries/useValidateImageExternalUrlQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { TFunction } from 'i18next';
import { ConflictingImageSourceAlert } from '../ConflictingImageSourceAlert';

export interface ExternalImageProps {
  existingImageUrl: string;
  onUrlChange: (url: string) => void;
  onUrlDelete: () => void;
  imageOriginsFromLibrary: boolean;
}

export const ExternalImage = ({
  onUrlChange,
  existingImageUrl,
  onUrlDelete,
  imageOriginsFromLibrary,
}: ExternalImageProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const [url, setUrl] = useState<string>(existingImageUrl);
  const {
    data: validationResult,
    status: validationStatus,
    refetch: validateNewUrl,
  } = useValidateImageExternalUrlQuery(org, app, url);

  const handleBlur = async (newUrl: string) => {
    if (newUrl === '') {
      onUrlDelete();
      setUrl(undefined);
      return;
    }
    setUrl(newUrl);
    const { data: newValidationResult } = await validateNewUrl();
    if (newValidationResult === 'Ok') {
      onUrlChange(newUrl);
    }
  };

  const handleValidation = (validation: string) => {
    if (validation === 'Ok') {
      return '';
    } else if (validation === 'NotValidUrl') {
      return t('ux_editor.properties_panel.images.invalid_external_url');
    } else if (validation === 'NotAnImage') {
      return t('ux_editor.properties_panel.images.invalid_external_url_not_an_image');
    }
  };

  return (
    <>
      <StudioToggleableTextfield
        viewProps={{
          children: existingImageUrl ?? url ?? (
            <span className={classes.missingUrl}>
              {t('ux_editor.properties_panel.images.external_url_not_added')}
            </span>
          ),
          label: t('ux_editor.properties_panel.images.enter_external_url'),
          title: url,
          variant: 'tertiary',
          fullWidth: true,
          icon: <LinkIcon />,
        }}
        inputProps={{
          icon: <LinkIcon />,
          value: existingImageUrl,
          onBlur: ({ target }: ChangeEvent<HTMLInputElement>) => handleBlur(target.value),
          label: t('ux_editor.properties_panel.images.enter_external_url'),
          size: 'small',
        }}
        setViewModeByDefault={!!existingImageUrl}
        setAutoFocus={false}
      />
      {!!url && renderValidationStatus(t, validationStatus, handleValidation(validationResult))}
      <ConflictingImageSourceAlert
        showAlert={imageOriginsFromLibrary}
        conflictSource={'external'}
      />
    </>
  );
};

const renderValidationStatus = (
  t: TFunction,
  validationStatus: string,
  validationMessage: string,
) => {
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
        <StudioParagraph className={classes.validationStatusContainer} size='small'>
          {t('ux_editor.properties_panel.images.validating_image_url_error')}
        </StudioParagraph>
      );
    case 'success':
      return (
        <StudioParagraph className={classes.validationStatusContainer} size='small'>
          {validationMessage}
        </StudioParagraph>
      );
  }
};
