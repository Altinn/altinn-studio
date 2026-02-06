import React from 'react';
import { type CustomTemplate } from 'app-shared/types/CustomTemplate';
import { useAvailableTemplatesForUserQuery } from '../../hooks/queries/useAvailableTemplatesForUserQuery';
import { TemplateSelectorContent } from './TemplateSelectorContent';

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
  const { data: availableTemplates } = useAvailableTemplatesForUserQuery(username);

  if (!availableTemplates || availableTemplates.length === 0) {
    return null;
  }

  return (
    <TemplateSelectorContent
      onChange={onChange}
      availableTemplates={availableTemplates}
      selectedTemplate={selectedTemplate}
    />
  );
};
