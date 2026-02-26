import React from 'react';
import { type CustomTemplate } from 'app-shared/types/CustomTemplate';
import { StudioCard, StudioHeading, StudioParagraph, StudioSelect } from '@studio/components';
import classes from './TemplateSelector.module.css';
import { useTranslation } from 'react-i18next';

export type TemplateSelectorContentProps = {
  availableTemplates: CustomTemplate[];
  selectedTemplate?: CustomTemplate;
  onChange: (selected?: CustomTemplate) => void;
};

export const TemplateSelectorContent = ({
  availableTemplates,
  selectedTemplate,
  onChange,
}: TemplateSelectorContentProps): React.ReactElement => {
  const { t } = useTranslation();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = availableTemplates.find(({ id }) => id === event.target.value);
    onChange(selected);
  };

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
            {template.name || template.id}
          </StudioSelect.Option>
        ))}
      </StudioSelect>
      {selectedTemplate && (
        <StudioCard variant='tinted' key={selectedTemplate.id}>
          <StudioHeading level={2} data-size='2xs' className={classes.templateName} spacing>
            {selectedTemplate.name || selectedTemplate.id}
          </StudioHeading>
          {selectedTemplate.description && (
            <StudioParagraph>{selectedTemplate.description}</StudioParagraph>
          )}
        </StudioCard>
      )}
    </div>
  );
};
