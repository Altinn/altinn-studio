import React from 'react';
import { type CustomTemplate } from 'app-shared/types/CustomTemplate';
import { StudioCard, StudioParagraph, StudioSelect } from '@studio/components';
import classes from './TemplateSelector.module.css';
import { useTranslation } from 'react-i18next';

export type TemplateSelectorProps = {
  templates: CustomTemplate[];
  selectedTemplates: CustomTemplate[];
  onChange: (selected: CustomTemplate[]) => void;
};

export const TemplateSelector = ({
  templates,
  selectedTemplates,
  onChange,
}: TemplateSelectorProps): React.JSX.Element => {
  const { t } = useTranslation();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions);
    const selected = templates.filter((template) =>
      selectedOptions.some((option) => option.value === template.id),
    );
    onChange(selected);
  };

  return (
    <div className={classes.templateSelectorContainer}>
      <StudioSelect
        onChange={handleChange}
        label={t('dashboard.new_application_form.select_templates')}
        description={t('dashboard.new_application_form.select_templates_description')}
        value={selectedTemplates.map((template) => template.id)}
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
      {selectedTemplates.map((template) => (
        <StudioCard key={template.id}>
          <StudioParagraph className={classes.templateName} spacing>
            {template.name.nb ?? template.id}
          </StudioParagraph>
          {template.description && (
            <StudioParagraph>{template.description.nb ?? template.id}</StudioParagraph>
          )}
        </StudioCard>
      ))}
    </div>
  );
};
