import { isAxiosError } from 'src/utils/isAxiosError';
import { putWithoutConfig } from 'src/utils/network/networking';
import { invalidateCookieUrl, redirectToUpgrade } from 'src/utils/urls/appUrlHelper';

function getRequiredAuthenticationLevel(error: unknown): string | undefined {
  if (isAxiosError(error) && error.response?.status === 403 && error.response.data) {
    return error.response.data['RequiredAuthenticationLevel'];
  }
  return undefined;
}

export function isAuthenticationRedirectError(error: unknown): boolean {
  return !!getRequiredAuthenticationLevel(error);
}

async function invalidateExistingAuthCookie(): Promise<void> {
  try {
    await putWithoutConfig(invalidateCookieUrl);
  } catch (e) {
    window.logError('Failed to invalidate auth cookie before step-up redirect:\n', e);
  }
}

export async function maybeAuthenticationRedirect(error: unknown): Promise<boolean> {
  const reqAuthLevel = getRequiredAuthenticationLevel(error);
  if (reqAuthLevel) {
    await invalidateExistingAuthCookie();
    redirectToUpgrade(reqAuthLevel);

    return true;
  }

  return false;
}
