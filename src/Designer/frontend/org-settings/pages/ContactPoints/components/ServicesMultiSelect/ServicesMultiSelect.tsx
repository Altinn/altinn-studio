import React from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSuggestion } from '@studio/components';
import type { StudioSuggestionItem } from '@studio/components';

type ServicesMultiSelectProps = {
  repos: string[];
  value: string[] | null;
  onChange: (value: string[] | null) => void;
};

export const ServicesMultiSelect = ({
  repos,
  value,
  onChange,
}: ServicesMultiSelectProps): ReactElement | null => {
  const { t } = useTranslation();

  if (repos.length === 0) return null;

  const selected: string[] = value === null ? repos : value;

  const handleSelectedChange = (items: StudioSuggestionItem[]) => {
    const selectedValues = items.map((item) => item.value);
    if (selectedValues.length === 0) {
      onChange([]);
    } else if (selectedValues.length === repos.length) {
      onChange(null);
    } else {
      onChange(selectedValues);
    }
  };

  return (
    <StudioSuggestion
      label={t('org.settings.contact_points.field_services')}
      description={t('org.settings.contact_points.services_description')}
      emptyText={t('org.settings.contact_points.services_empty')}
      multiple
      selected={selected}
      onSelectedChange={handleSelectedChange}
    >
      {repos.map((repo) => (
        <StudioSuggestion.Option key={repo} value={repo}>
          {repo}
        </StudioSuggestion.Option>
      ))}
    </StudioSuggestion>
  );
};
