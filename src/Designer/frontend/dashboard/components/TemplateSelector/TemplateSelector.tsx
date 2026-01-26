import React from 'react';
import { type CustomTemplate } from 'app-shared/types/CustomTemplate';
import { StudioCard, StudioParagraph, StudioSelect } from '@studio/components';
import classes from './TemplateSelector.module.css';
import { useTranslation } from 'react-i18next';

export type TemplateSelectorProps = {
  templates: CustomTemplate[];
  selectedTemplate: CustomTemplate;
  onChange: (selected: CustomTemplate) => void;
};

export const TemplateSelector = ({
  templates,
  selectedTemplate,
  onChange,
}: TemplateSelectorProps): React.JSX.Element => {
  const { t } = useTranslation();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions);
    const selected = templates.find((template) =>
      selectedOptions.some((option) => option.value === template.id),
    );
    onChange(selected);
  };

  if (templates.length === 0) {
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
        {templates.map((template) => (
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
