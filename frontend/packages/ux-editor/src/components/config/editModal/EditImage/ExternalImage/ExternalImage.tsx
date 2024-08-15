import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
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
    debugger;
    if (newValidationResult === 'Ok') {
      onUrlChange(newUrl);
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
