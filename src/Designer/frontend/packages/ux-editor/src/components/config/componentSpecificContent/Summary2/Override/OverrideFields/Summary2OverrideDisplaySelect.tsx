import React from 'react';
import type {
  OverrideDisplay,
  Summary2OverrideConfig,
} from 'app-shared/types/ComponentSpecificConfig';
import { StudioNativeSelect } from 'libs/studio-components-legacy/src';
import { useTranslation } from 'react-i18next';

type Summary2OverrideDisplaySelectProps = {
  onChange: (override: Summary2OverrideConfig) => void;
  override: Summary2OverrideConfig;
};

export const Summary2OverrideDisplaySelect = ({
  onChange,
  override,
}: Summary2OverrideDisplaySelectProps) => {
  const { t } = useTranslation();

  const options = [
    { value: 'table', text: t('ux_editor.component_properties.summary.override.display.table') },
    { value: 'full', text: t('ux_editor.component_properties.summary.override.display.full') },
  ];

  return (
    <StudioNativeSelect
      size='sm'
      label={t('ux_editor.component_properties.summary.override.display')}
      value={override.display}
      onChange={(event) => {
        onChange({ ...override, display: event.target.value as OverrideDisplay });
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.text}
        </option>
      ))}
    </StudioNativeSelect>
  );
};
