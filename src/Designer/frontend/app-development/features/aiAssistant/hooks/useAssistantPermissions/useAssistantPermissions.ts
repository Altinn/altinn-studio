import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const ALLOWED_ORGANIZATIONS = ['ttd', 'nfk', 'ssb', 'dat', 'brg', 'staf', 'ikta'];

/**
 * During beta, access is restricted to specific organizations.
 * Backend permissions are enforced by AuthorizationConfiguration/AiAssistantPermissionHandler.
 */
export const useAssistantPermissions = (): boolean => {
  const { org } = useStudioEnvironmentParams();
  return ALLOWED_ORGANIZATIONS.includes(org);
};
