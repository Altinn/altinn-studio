import type { ReactElement } from 'react';
import { StudioAlert, StudioError } from '@studio/components';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { useCurrentOrg } from 'admin/contexts/OrgContext';
import { useEnvironmentTitle } from 'admin/features/apps/hooks/useEnvironmentTitle';
import { isEngineUnavailableError } from 'admin/features/apps/utils/workflowHealth';

export type WorkflowEngineErrorProps = {
  environment: string;
  error: unknown;
};

/**
 * What an engine-backed view shows when its read failed and it has nothing to show instead.
 *
 * An engine that is not deployed in this environment is a normal state and reads as information;
 * a missing admin right names the org and environment it is missing for; anything else is an error.
 */
export const WorkflowEngineError = ({
  environment,
  error,
}: WorkflowEngineErrorProps): ReactElement => {
  const { t } = useTranslation();
  const currentOrg = useCurrentOrg();
  const orgName = currentOrg.full_name || currentOrg.username;
  const envTitle = useEnvironmentTitle(environment);

  if (isEngineUnavailableError(error)) {
    return (
      <StudioAlert data-color='info'>{t('admin.workflows.unavailable', { envTitle })}</StudioAlert>
    );
  }
  if (isAxiosError(error) && error.response?.status === 403) {
    return (
      <StudioAlert data-color='info'>
        {t('admin.instances.missing_rights', { envTitle, orgName })}
      </StudioAlert>
    );
  }
  return <StudioError>{t('general.page_error_title')}</StudioError>;
};
