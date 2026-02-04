import React from 'react';
import { type CustomTemplate } from 'app-shared/types/CustomTemplate';
import { StudioCard, StudioParagraph, StudioSelect } from '@studio/components';
import { useAvailableTemplatesForUserQuery } from '../../hooks/queries/useAvailableTemplatesForOrgQuery';
import classes from './TemplateSelector.module.css';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

export type TemplateSelectorProps = {
  selectedTemplate?: CustomTemplate;
  onChange: (selected?: CustomTemplate) => void;
  username: string;
};

export const TemplateSelector = ({
  selectedTemplate,
  onChange,
  username,
}: TemplateSelectorProps): React.ReactNode => {
  const { t } = useTranslation();
  const { data: availableTemplates } = useAvailableTemplatesForUserQuery(username);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = availableTemplates?.find(({ id }) => id === event.target.value);
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
            {template.name[DEFAULT_LANGUAGE] ?? template.id}
          </StudioSelect.Option>
        ))}
      </StudioSelect>
      {selectedTemplate && (
        <StudioCard key={selectedTemplate.id}>
          <StudioParagraph className={classes.templateName} spacing>
            {selectedTemplate.name[DEFAULT_LANGUAGE] ?? selectedTemplate.id}
          </StudioParagraph>
          {selectedTemplate.description && (
            <StudioParagraph>
              {selectedTemplate.description[DEFAULT_LANGUAGE] ?? ''}
            </StudioParagraph>
          )}
        </StudioCard>
      )}
    </div>
  );
};
