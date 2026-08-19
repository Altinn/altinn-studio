import React from 'react';
import type { AppTemplate } from 'app-shared/types/AppTemplate';
import { StudioSelect } from '@studio/components';
import { useTranslation } from 'react-i18next';

export type AppTemplateSelectorProps = {
  appTemplates: AppTemplate[];
  selectedAppTemplate?: AppTemplate;
  onChange: (selected?: AppTemplate) => void;
};

export const AppTemplateSelector = ({
  appTemplates,
  selectedAppTemplate,
  onChange,
}: AppTemplateSelectorProps): React.ReactElement => {
  const { t } = useTranslation();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(appTemplates.find(({ id }) => id === event.target.value));
  };

  return (
    <StudioSelect
      name='appTemplate'
      label={t('dashboard.new_application_form.select_app_template')}
      description={selectedAppTemplate?.description}
      value={selectedAppTemplate?.id ?? ''}
      onChange={handleChange}
    >
      {appTemplates.map((appTemplate) => (
        <StudioSelect.Option key={appTemplate.id} value={appTemplate.id}>
          {appTemplate.displayName}
        </StudioSelect.Option>
      ))}
    </StudioSelect>
  );
};
