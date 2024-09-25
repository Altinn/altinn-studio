import type { ChangeEvent } from 'react';
import React, { useEffect, useState } from 'react';
import { LinkIcon } from '@studio/icons';
import { StudioToggleableTextfield } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './ExternalImage.module.css';
import { useValidateImageExternalUrlQuery } from 'app-shared/hooks/queries/useValidateImageExternalUrlQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { ConflictingImageSourceAlert } from '../ConflictingImageSourceAlert';
import { ExternalImageValidationStatus } from './ExternalImageValidationStatus';

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
  const { data: validationResult, status: validationStatus } = useValidateImageExternalUrlQuery(
    org,
    app,
    url,
  );

  useEffect(() => {
    if (validationStatus === 'success' && validationResult === 'Ok' && url !== existingImageUrl) {
      onUrlChange(url);
    }
  }, [validationResult, validationStatus, onUrlChange, url, existingImageUrl]);

  const handleBlur = async (newUrl: string) => {
    if (isBLurInitialWithEmptyInput(url, newUrl)) return;
    if (newUrl === '') {
      onUrlDelete();
      setUrl(undefined);
      return;
    }
    setUrl(newUrl);
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
        autoFocus={false}
      />
      {!!url && (
        <ExternalImageValidationStatus
          validationStatus={validationStatus}
          validationResult={validationResult}
        />
      )}
      <div className={classes.alertContainer}>
        <ConflictingImageSourceAlert
          showAlert={imageOriginsFromLibrary}
          conflictSource={'external'}
        />
      </div>
    </>
  );
};

const isBLurInitialWithEmptyInput = (existingUrl: string, newUrl: string) =>
  newUrl === '' && existingUrl === undefined;
