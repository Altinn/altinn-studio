import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
import { LinkIcon } from '@studio/icons';
import { StudioToggleableTextfield } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { monitorExternalUrlFromPreviewForValidation } from 'app-shared/hooks/queries/useValidateExternalUrl';
import classes from './ImageFromUrl.module.css';

export interface ImageFromUrlProps {
  existingImageUrl: string;
  onUrlChange: (url: string) => void;
  onUrlDelete: () => void;
}

export const ImageFromUrl = ({ onUrlChange, existingImageUrl, onUrlDelete }: ImageFromUrlProps) => {
  const { t } = useTranslation();
  //const [extUrl, setExtUrl] = useState<string>(existingImageUrl);
  const [validationMessage, setValidationMessage] = useState<string>('');

  const handleBlur = async (url: string) => {
    if (url === '') {
      onUrlDelete();
      return;
    }
    onUrlChange(url);

    // Start the validation process
    const result = await monitorExternalUrlFromPreviewForValidation(url);
    if (result && result.status === 200) {
      setValidationMessage(''); // No error message if the request is successful
    } else {
      setValidationMessage(t('ux_editor.properties_panel.images.invalid_external_url'));
    }
  };

  return (
    <StudioToggleableTextfield
      viewProps={{
        children: existingImageUrl ?? (
          <span className={classes.missingUrl}>
            {t('ux_editor.properties_panel.images.external_url_not_added')}
          </span>
        ),
        label: t('ux_editor.properties_panel.images.enter_external_url'),
        title: existingImageUrl,
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
      customValidation={() => validationMessage}
      setViewModeByDefault={!!existingImageUrl}
      setAutoFocus={false}
    />
  );
};
