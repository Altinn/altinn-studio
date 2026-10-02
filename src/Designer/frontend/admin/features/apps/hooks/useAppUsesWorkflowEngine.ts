import { useAppMetadataQuery } from 'admin/features/apps/hooks/queries/useAppMetadataQuery';
import { usesWorkflowEngine } from 'admin/features/apps/utils/workflowEngineSupport';

/**
 * Whether the app, as it runs in this environment, moves its process on the workflow engine: read
 * from the version of the app libraries the running app reports. Undefined until the app has
 * answered, and false when it cannot be told — the panel then shows the app as one that does not
 * use the engine, and asks the engine nothing about it.
 */
export const useAppUsesWorkflowEngine = (
  org: string,
  environment: string,
  app: string,
): boolean | undefined => {
  const { data, status } = useAppMetadataQuery(org, environment, app);
  if (status === 'pending') {
    return undefined;
  }
  return status === 'success' && usesWorkflowEngine(data.altinnNugetVersion);
};
