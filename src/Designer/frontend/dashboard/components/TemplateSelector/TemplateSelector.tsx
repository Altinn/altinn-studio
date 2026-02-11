import React from 'react';
import { type CustomTemplate } from 'app-shared/types/CustomTemplate';
import { useAvailableTemplatesForUserQuery } from '../../hooks/queries/useAvailableTemplatesForUserQuery';
import { TemplateSelectorContent } from './TemplateSelectorContent';
import type { Organization } from 'app-shared/types/Organization';

export type TemplateSelectorProps = {
  selectedTemplate?: CustomTemplate;
  onChange: (selected?: CustomTemplate) => void;
  username: string;
  organizations: Organization[];
};

export const TemplateSelector = ({
  selectedTemplate,
  onChange,
  username,
  organizations,
}: TemplateSelectorProps): React.ReactNode => {
  const { data: availableTemplates } = useAvailableTemplatesForUserQuery(username);

  if (!availableTemplates || availableTemplates.length === 0) {
    return null;
  }

  return (
    <TemplateSelectorContent
      onChange={onChange}
      availableTemplates={availableTemplates}
      selectedTemplate={selectedTemplate}
      organizations={organizations}
    />
  );
};
