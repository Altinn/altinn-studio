import React from 'react';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { useComponentPropertyEnumValue } from '@altinn/ux-editor/hooks';
import { useTranslation } from 'react-i18next';

export type ValidateRuleConfigProps = {
  selectedTypes: StudioSuggestionItem[];
  selectedPageScope: StudioSuggestionItem;
  onChange: (updates: { types?: StudioSuggestionItem[]; pageScope?: StudioSuggestionItem }) => void;
};

export const ValidateRuleConfig = ({
  selectedTypes,
  selectedPageScope,
  onChange,
}: ValidateRuleConfigProps) => {
  const configEnumValue = useComponentPropertyEnumValue();
  const { t } = useTranslation();
  const validateTypes = [
    'Schema',
    'Component',
    'Expression',
    'CustomBackend',
    'Required',
    'AllExceptRequired',
    'All',
  ];
  const validateScopes = ['current', 'currentAndPrevious', 'all']; // Temporary hardcoded list of validation types, will extract from schema in next PR

  return (
    <>
      <StudioSuggestion
        selected={selectedTypes}
        label={t('ux_editor.settings.navigation_validation_type_label')}
        emptyText={t('ux_editor.settings.navigation_validation_type_empty')}
        onSelectedChange={(selected) => onChange({ types: selected })}
        multiple
      >
        {validateTypes.map((type) => (
          <StudioSuggestion.Option key={type} value={type}>
            {configEnumValue(type)}
          </StudioSuggestion.Option>
        ))}
      </StudioSuggestion>
      <StudioSuggestion
        selected={selectedPageScope}
        label={t('ux_editor.settings.navigation_validation_scope')}
        emptyText={t('ux_editor.settings.navigation_validation_scope_empty')}
        onSelectedChange={(selectedScope) => onChange({ pageScope: selectedScope })}
        multiple={false}
      >
        {validateScopes.map((scope) => (
          <StudioSuggestion.Option key={scope} value={scope}>
            {configEnumValue(scope)}
          </StudioSuggestion.Option>
        ))}
      </StudioSuggestion>
    </>
  );
};
