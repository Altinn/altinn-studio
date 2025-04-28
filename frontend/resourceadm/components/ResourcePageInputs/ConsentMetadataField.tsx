import React from 'react';
import classes from './ResourcePageInputs.module.css';
import { StudioSwitch, StudioLabelAsParagraph } from '@studio/components-legacy';
import type { ConsentMetadata } from 'app-shared/types/ResourceAdm';
import { useTranslation } from 'react-i18next';

type ConsentMetadataFieldProps = {
  /**
   * The value in the field
   */
  value: ConsentMetadata;
  /**
   * Function to be executed when the field is focused
   * @returns void
   */
  onFocus: () => void;
  /**
   * Function to be executed on change
   * @param value the value used in the field
   * @returns void
   */
  onChange: (value: ConsentMetadata) => void;
};

export const ConsentMetadataField = ({
  value,
  onFocus,
  onChange,
}: ConsentMetadataFieldProps): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className={classes.inputWrapper}>
      <div className={classes.consentMetadata}>
        <StudioLabelAsParagraph size='sm'>
          {t('resourceadm.about_resource_consent_metadata_text')}
        </StudioLabelAsParagraph>
        <StudioLabelAsParagraph size='sm'>
          {t('resourceadm.about_resource_consent_metadata_optional')}
        </StudioLabelAsParagraph>
      </div>
      {Object.keys(value).map((metadataName) => {
        const isOptional = value[metadataName]?.optional || false;

        return (
          <div key={metadataName} className={classes.consentMetadata}>
            <div>{metadataName}</div>
            <StudioSwitch
              size='sm'
              checked={isOptional}
              aria-label={t('resourceadm.about_resource_consent_metadata_optional_label', {
                metadataName,
              })}
              onFocus={onFocus}
              onChange={(event) => {
                const isChecked = event.target.checked;
                const newValue = { ...value };
                newValue[metadataName] = { optional: isChecked };
                onChange(newValue);
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
