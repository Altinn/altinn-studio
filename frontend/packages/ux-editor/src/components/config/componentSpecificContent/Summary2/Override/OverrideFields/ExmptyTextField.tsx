import React from 'react';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import { StudioAlert, StudioParagraph, StudioToggleableTextfield } from '@studio/components';
import { useTranslation } from 'react-i18next';

type EmptyTextFieldProps = {
  onChange: (label: keyof Summary2OverrideConfig, value: string | boolean) => void;
  override: Summary2OverrideConfig;
};

export const EmptyTextField = ({ onChange, override }: EmptyTextFieldProps) => {
  const { t } = useTranslation();

  if (override.hideEmptyFields) {
    return (
      <StudioAlert>
        {t('ux_editor.component_properties.summary.override.hide_empty_fields.info_message')}
      </StudioAlert>
    );
  }

  return (
    <StudioToggleableTextfield
      inputProps={{
        icon: '',
        label: t('ux_editor.component_properties.summary.override.empty_field_text'),
        size: 'sm',
        value: override.emptyFieldText ?? '',
        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
          onChange('emptyFieldText', event.target.value),
      }}
      viewProps={{
        style: { padding: '0' },
        icon: null,
        children: (
          <StudioParagraph size='small'>
            <strong>{t('ux_editor.component_properties.summary.override.empty_field_text')}</strong>
            <br />
            {override.emptyFieldText}
          </StudioParagraph>
        ),
        variant: 'tertiary',
      }}
    ></StudioToggleableTextfield>
  );
};
