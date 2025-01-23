import React, { useEffect, useState } from 'react';
import { LinkIcon } from '@studio/icons';
import { StudioIconTextfield, StudioToggleableTextfield } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './ExternalImage.module.css';
import { useValidateImageExternalUrlQuery } from 'app-shared/hooks/queries/useValidateImageExternalUrlQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { ConflictingImageSourceAlert } from '../ConflictingImageSourceAlert';
import { ExternalImageValidationStatus } from './ExternalImageValidationStatus';

export interface ExternalImageProps {
  existingImageUrl: string | undefined;
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
  const { org, app } = useStudioEnvironmentParams();
  const [url, setUrl] = useState<string | undefined>(existingImageUrl);
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
    if (newUrl === '' && !isBLurInitialWithEmptyInput(url, newUrl)) {
      onUrlDelete();
    }
    setUrl(newUrl);
  };

  return (
    <>
      <EditUrl
        url={url}
        existingImageUrl={existingImageUrl}
        onBlur={(event) => handleBlur(event.target.value)}
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

type EditUrlProps = {
  url: string | undefined;
  existingImageUrl: string | undefined;
  onBlur: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

const EditUrl = ({ url, existingImageUrl, onBlur }: EditUrlProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isViewMode, setIsViewMode] = useState<boolean>();
  const label = t('ux_editor.properties_panel.images.enter_external_url');
  const noUrlText = t('ux_editor.properties_panel.images.external_url_not_added');
  const value = calculateViewValue(url, noUrlText, isViewMode);

  return isInitialUrlProvided(url, existingImageUrl) ? (
    <StudioToggleableTextfield
      onIsViewMode={setIsViewMode}
      icon={<LinkIcon />}
      label={label}
      onBlur={onBlur}
      title={url}
      value={value}
    />
  ) : (
    <StudioIconTextfield label={label} value={url} onBlur={onBlur} icon={<LinkIcon />} />
  );
};

const isBLurInitialWithEmptyInput = (existingUrl: string | undefined, newUrl: string): boolean =>
  newUrl === '' && existingUrl === undefined;

const isInitialUrlProvided = (
  url: string | undefined,
  existingImageUrl: string | undefined,
): boolean => url !== undefined || !!existingImageUrl;

export const calculateViewValue = (
  url: string | undefined,
  noUrlText: string,
  isViewMode: boolean,
): string | undefined => {
  const currentUrl = !url ? noUrlText : url;
  const currentUrlIsUserProvided = currentUrl !== noUrlText;
  const showValue = currentUrlIsUserProvided || isViewMode;
  return showValue ? currentUrl : undefined;
};
