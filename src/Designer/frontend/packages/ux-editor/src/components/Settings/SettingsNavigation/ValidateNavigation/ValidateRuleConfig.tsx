import React from 'react';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { StudioSelect } from '@studio/components';
import { useComponentPropertyEnumValue } from '@altinn/ux-editor/hooks';
import { useTranslation } from 'react-i18next';

type ValidationRuleConfigProps = {
  types: StudioSuggestionItem[];
  pageScope: string;
  onChange: (updates: { types?: StudioSuggestionItem[]; pageScope?: string }) => void;
};

export const ValidationRuleConfig = ({ types, pageScope, onChange }: ValidationRuleConfigProps) => {
  const configEnumValue = useComponentPropertyEnumValue();
  const { t } = useTranslation();
  const validationTypes = [
    'Schema',
    'Component',
    'Expression',
    'CustomBackend',
    'Required',
    'AllExceptRequired',
    'All',
  ]; // Temporary hardcoded list of validation types, will extract from schema in next PR
  const validationScopes = ['current', 'currentAndPrevious', 'all']; // Temporary hardcoded list of validation types, will extract from schema in next PR

  return (
    <>
      <StudioSuggestion
        selected={types}
        label={t('ux_editor.settings.navigation_validation_type_label')}
        emptyText={t('ux_editor.settings.navigation_validation_type_empty')}
        onSelectedChange={(selectedTypes) => onChange({ types: selectedTypes })}
        multiple
      >
        {validationTypes.map((type) => (
          <StudioSuggestion.Option key={type} value={type}>
            {configEnumValue(type)}
          </StudioSuggestion.Option>
        ))}
      </StudioSuggestion>
      <StudioSelect
        label={t('ux_editor.settings.navigation_validation_scope')}
        value={pageScope}
        onChange={(e) => onChange({ pageScope: e.target.value })}
      >
        {validationScopes.map((scope) => (
          <StudioSelect.Option key={scope} value={scope}>
            {configEnumValue(scope)}
          </StudioSelect.Option>
        ))}
      </StudioSelect>
    </>
  );
};
