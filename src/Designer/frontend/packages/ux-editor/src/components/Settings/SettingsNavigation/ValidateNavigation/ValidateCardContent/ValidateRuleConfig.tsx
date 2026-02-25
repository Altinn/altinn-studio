import React from 'react';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { useComponentPropertyEnumValue } from '@altinn/ux-editor/hooks';
import { useTranslation } from 'react-i18next';
import { getRuleEnums, RuleType } from '../utils/ValidateNavigationUtils';

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
  const pageScopes = getRuleEnums(RuleType.Page);
  const validationTypes = getRuleEnums(RuleType.Show);

  return (
    <>
      <StudioSuggestion
        selected={selectedTypes}
        label={t('ux_editor.settings.navigation_validation_type_label')}
        emptyText={t('ux_editor.settings.navigation_validation_type_empty')}
        onSelectedChange={(selected) => onChange({ types: selected })}
        multiple
      >
        {validationTypes.map((type) => (
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
        {pageScopes.map((scope) => (
          <StudioSuggestion.Option key={scope} value={scope}>
            {configEnumValue(scope)}
          </StudioSuggestion.Option>
        ))}
      </StudioSuggestion>
    </>
  );
};
