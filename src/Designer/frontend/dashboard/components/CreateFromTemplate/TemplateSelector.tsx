import React from 'react';
import { type CustomTemplate } from 'app-shared/types/CustomTemplate';
import { StudioSelect } from '@studio/components';
import classes from './TemplateSelector.module.css';
import { useTranslation } from 'react-i18next';
import type { Organization } from 'app-shared/types/Organization';
import { groupTemplatesByOwner } from '../../utils/customTemplateUtils/customTemplateUtils';

export type TemplateSelectorProps = {
  availableTemplates: CustomTemplate[];
  selectedTemplate?: CustomTemplate;
  onChange: (selected?: CustomTemplate) => void;
  organizations: Organization[];
};

export const TemplateSelector = ({
  availableTemplates,
  selectedTemplate,
  onChange,
  organizations,
}: TemplateSelectorProps): React.ReactElement => {
  const { t } = useTranslation();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = availableTemplates.find(({ id }) => id === event.target.value);
    onChange(selected);
  };

  const groupedTemplates = groupTemplatesByOwner(availableTemplates, organizations);

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
        {Object.entries(groupedTemplates).map(([owner, templates]) => (
          <StudioSelect.OptGroup key={owner} label={owner}>
            {templates.map((template) => (
              <StudioSelect.Option key={template.id} value={template.id}>
                {template.name || template.id}
              </StudioSelect.Option>
            ))}
          </StudioSelect.OptGroup>
        ))}
      </StudioSelect>
    </div>
  );
};
