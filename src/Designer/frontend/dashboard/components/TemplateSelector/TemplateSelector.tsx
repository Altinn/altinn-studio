import React from 'react';
import { type CustomTemplate } from 'app-shared/types/CustomTemplate';
import { StudioCard, StudioParagraph, StudioSelect } from '@studio/components';
import { useAvailableTemplatesForOrgQuery } from '../../hooks/queries/useAvailableTemplatesForOrgQuery';
import classes from './TemplateSelector.module.css';
import { useTranslation } from 'react-i18next';

export type TemplateSelectorProps = {
  selectedTemplate?: CustomTemplate;
  onChange: (selected?: CustomTemplate) => void;
};

export const TemplateSelector = ({
  selectedTemplate,
  onChange,
}: TemplateSelectorProps): React.JSX.Element => {
  const { t } = useTranslation();

  // TODO: Allow for fetching templates based on selected org when org selector is changed
  const { data: availableTemplates } = useAvailableTemplatesForOrgQuery();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions);
    const selected = availableTemplates?.find((template) =>
      selectedOptions.some((option) => option.value === template.id),
    );
    onChange(selected);
  };

  if (!availableTemplates || availableTemplates.length === 0) {
    return null;
  }

  return (
    <div className={classes.templateSelectorContainer}>
      <StudioSelect
        onChange={handleChange}
        label={t('dashboard.new_application_form.select_templates')}
        description={t('dashboard.new_application_form.select_templates_description')}
        value={selectedTemplate?.id || ''}
      >
        <StudioSelect.Option value=''>
          {t('dashboard.new_application_form.select_templates_default')}
        </StudioSelect.Option>
        {availableTemplates.map((template) => (
          <StudioSelect.Option key={template.id} value={template.id}>
            {template.name.nb ?? template.id}
          </StudioSelect.Option>
        ))}
      </StudioSelect>
      {selectedTemplate && (
        <StudioCard key={selectedTemplate.id}>
          <StudioParagraph className={classes.templateName} spacing>
            {selectedTemplate.name.nb ?? selectedTemplate.id}
          </StudioParagraph>
          {selectedTemplate.description && (
            <StudioParagraph>{selectedTemplate.description.nb ?? ''}</StudioParagraph>
          )}
        </StudioCard>
      )}
    </div>
  );
};
