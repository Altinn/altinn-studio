import React from 'react';
import { type CustomTemplate } from 'app-shared/types/CustomTemplate';
import { useAvailableTemplatesForUserQuery } from '../../hooks/queries/useAvailableTemplatesForUserQuery';
import { TemplateSelector } from './TemplateSelector';
import type { Organization } from 'app-shared/types/Organization';
import { TemplateDetails } from './TemplateDetails';
import { getOrgNameByUsername } from '../../utils/userUtils';
import { StudioAlert, StudioHeading, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';

export type CreateFromTemplateProps = {
  selectedTemplate?: CustomTemplate;
  onChange: (selected?: CustomTemplate) => void;
  username: string;
  organizations: Organization[];
  error?: string;
};

export const CreateFromTemplate = ({
  selectedTemplate,
  onChange,
  username,
  organizations,
  error,
}: CreateFromTemplateProps): React.ReactNode => {
  const { t } = useTranslation();
  const { data: availableTemplates } = useAvailableTemplatesForUserQuery(username);

  if (!availableTemplates || availableTemplates.length === 0) {
    return null;
  }

  return (
    <>
      <TemplateSelector
        onChange={onChange}
        availableTemplates={availableTemplates}
        selectedTemplate={selectedTemplate}
        organizations={organizations}
      />
      {error && (
        <StudioAlert data-color='danger' data-size='sm'>
          <StudioHeading level={3} data-size='2xs'>
            {t('dashboard.new_application_form.template_error.heading')}
          </StudioHeading>
          <StudioParagraph>{error}</StudioParagraph>
        </StudioAlert>
      )}
      {selectedTemplate && (
        <TemplateDetails
          id={selectedTemplate.id}
          name={selectedTemplate.name}
          description={selectedTemplate.description}
          owner={
            getOrgNameByUsername(selectedTemplate.owner, organizations) || selectedTemplate.owner
          }
        />
      )}
    </>
  );
};
